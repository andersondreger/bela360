import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma, redis, logger, env } from '../../config';
import { telegramClient } from '../telegram/telegram.client';
import { getSystemWhatsAppService } from '../whatsapp/whatsapp.service';
import { AppError } from '../../common/errors';
import { verifyPassword, hashPassword } from '../../common/password';

interface TokenPayload {
  userId: string;
  businessId: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly OTP_COOLDOWN_SECONDS = 60;
  private readonly TELEGRAM_LINK_TTL_SECONDS = 10 * 60;

  /**
   * Generate OTP code
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Gera um OTP, salva no usuario + Redis (backup) e aplica o cooldown de
   * reenvio - logica compartilhada entre requestOTP (login) e
   * sendWelcomeOtp (logo apos o cadastro), pra nao duplicar as regras de
   * expiracao/cooldown/backup em dois lugares.
   */
  private async issueOtp(userId: string, phone: string): Promise<string> {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { otpCode: otp, otpExpiresAt: expiresAt },
    });

    await redis.setex(`otp:cooldown:${phone}`, this.OTP_COOLDOWN_SECONDS, '1');
    await redis.setex(`otp:${phone}`, this.OTP_EXPIRY_MINUTES * 60, otp);

    return otp;
  }

  private readonly DELIVERY_ALERT_COOLDOWN_SECONDS = 15 * 60;

  /**
   * Tenta mandar pelo WhatsApp institucional (instancia de sistema no
   * Evolution) primeiro; se a instancia nao estiver conectada ou o envio
   * falhar, cai pro Telegram (se o usuario ja tiver vinculado um chat, ver
   * linkTelegram). Nunca lanca erro pra quem chama - notificacao de OTP nao
   * pode derrubar login/cadastro so porque um canal de entrega falhou.
   *
   * Se o usuario ainda nao vinculou Telegram, nao ha "canal de fallback" pra
   * tentar - isso e o caminho normal enquanto o WhatsApp institucional
   * estiver fora do ar (numero bloqueado em 2026-08-18): a pessoa recebe o
   * codigo assim que abrir o link do bot (botao "Abrir o Telegram e receber
   * o codigo" no cadastro/login, que dispara requestTelegramLink ->
   * relayPendingOtp). Isso NAO e alertavel, e o fluxo esperado pra todo
   * cadastro novo.
   *
   * So alerta o admin quando o usuario JA tinha Telegram vinculado (deveria
   * ter recebido automaticamente) e mesmo assim os dois canais falharam -
   * isso sim e uma falha de infraestrutura de verdade (bot token invalido,
   * Telegram fora do ar, etc), nao o "ainda nao vinculei" esperado.
   */
  private async notifyUser(user: { id: string; phone: string; telegramChatId: string | null }, text: string): Promise<void> {
    try {
      await getSystemWhatsAppService().sendText({ number: user.phone, text });
      return;
    } catch (error) {
      logger.warn(
        { error, phone: user.phone },
        'WhatsApp institucional indisponivel, usando fallback Telegram'
      );
    }

    if (!user.telegramChatId) return;

    try {
      await telegramClient.sendMessage(user.telegramChatId, text);
    } catch (error) {
      logger.error({ error, phone: user.phone }, 'Fallback Telegram tambem falhou');
      await this.alertAdminsOfDeliveryFailure(user.phone);
    }
  }

  /**
   * Avisa os admins que um usuario com Telegram ja vinculado nao recebeu um
   * codigo/mensagem de sistema por nenhum canal - falha de infraestrutura
   * de verdade, nao o "usuario ainda nao vinculou Telegram" esperado.
   * Cooldown de 15min pra nao virar spam se o problema persistir.
   *
   * Usa ADMIN_TELEGRAM_CHAT_ID (env) como destino principal - nenhuma conta
   * com isSuperAdmin=true tem Telegram vinculado hoje (achado em
   * 2026-08-18), entao depender so da flag deixaria o alerta sem
   * destinatario. Superadmins com Telegram vinculado no futuro tambem
   * recebem, sem precisar mexer aqui de novo.
   */
  private async alertAdminsOfDeliveryFailure(phone: string): Promise<void> {
    const cooldownKey = 'otp:delivery-alert:cooldown';
    if (await redis.get(cooldownKey)) return;
    await redis.setex(cooldownKey, this.DELIVERY_ALERT_COOLDOWN_SECONDS, '1');

    try {
      const admins = await prisma.user.findMany({
        where: { isSuperAdmin: true, telegramChatId: { not: null } },
        select: { telegramChatId: true },
      });

      const chatIds = new Set(admins.map(admin => admin.telegramChatId as string));
      if (env.ADMIN_TELEGRAM_CHAT_ID) chatIds.add(env.ADMIN_TELEGRAM_CHAT_ID);

      if (chatIds.size === 0) {
        logger.error({ phone }, 'Falha de entrega de OTP sem nenhum admin pra alertar (ADMIN_TELEGRAM_CHAT_ID nao configurado)');
        return;
      }

      const alertText =
        `⚠️ bela360: usuário ${phone} já tinha Telegram vinculado mas não recebeu ` +
        `o código/mensagem de sistema por nenhum canal (WhatsApp e Telegram falharam). ` +
        `Verifique se o bot Telegram está respondendo.`;

      await Promise.all([...chatIds].map(chatId => telegramClient.sendMessage(chatId, alertText)));
    } catch (error) {
      logger.error({ error, phone }, 'Falha ao alertar admins sobre falha de entrega de OTP');
    }
  }

  /**
   * Reenvia o OTP pendente do usuario (se ainda valido) pro chat do Telegram
   * recem vinculado - compartilhado entre o cadastro direto no bot
   * (telegram-signup.service.ts, chatId ja conhecido) e o vinculo por token
   * (linkTelegram, gerado pela tela de login/onboarding).
   */
  private async relayPendingOtp(userId: string, chatId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.otpCode && user.otpExpiresAt && user.otpExpiresAt > new Date()) {
      await telegramClient.sendMessage(
        chatId,
        `🔐 Seu código de acesso bela360:\n\n*${user.otpCode}*\n\nVálido por alguns minutos.`
      );
    }
  }

  /**
   * Gera um link de vinculo pro Telegram (@Bela360bot) pro dono de uma conta
   * que ja existe, pra ele poder receber OTP/boas-vindas por la enquanto o
   * WhatsApp de sistema nao conecta. Nao revela se o telefone existe ou nao
   * (mesma postura do requestOTP) - o token sempre e gerado, so nao vincula
   * nada se o telefone nao bater com nenhuma conta quando o /start chegar.
   */
  async requestTelegramLink(phone: string): Promise<{ botUsername: string; link: string; token: string }> {
    const normalizedPhone = phone.replace(/\D/g, '');
    const token = randomBytes(16).toString('hex');

    await redis.setex(`telegram:link:${token}`, this.TELEGRAM_LINK_TTL_SECONDS, normalizedPhone);

    const botUsername = env.TELEGRAM_BOT_USERNAME || 'Bela360bot';
    return { botUsername, link: `https://t.me/${botUsername}?start=${token}`, token };
  }

  /**
   * Chamado pelo webhook do Telegram quando chega "/start <token>". Resolve
   * o telefone que gerou o token, acha o usuario e grava o chatId. Silencioso
   * se o token expirou/nao existe ou o telefone nao bate com nenhuma conta -
   * quem chama decide o que responder ao usuario no chat.
   */
  async linkTelegram(token: string, chatId: string): Promise<{ linked: boolean; userName?: string }> {
    const phone = await redis.get(`telegram:link:${token}`);
    if (!phone) return { linked: false };

    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) return { linked: false };

    await prisma.user.update({ where: { id: user.id }, data: { telegramChatId: chatId } });
    await redis.del(`telegram:link:${token}`);
    await this.relayPendingOtp(user.id, chatId);

    logger.info({ userId: user.id }, 'Conta vinculada ao Telegram');
    return { linked: true, userName: user.name };
  }

  /**
   * Vincula o chat direto (sem token) e reenvia o OTP que ja estava pendente
   * pra esse usuario - usado pelo cadastro feito dentro do proprio Telegram
   * (telegram-signup.service.ts), onde o chatId ja e conhecido de cara e o
   * codigo de boas-vindas foi emitido um passo antes, so sem chegar em
   * nenhum canal ainda porque o telegramChatId nao existia no momento do
   * cadastro.
   */
  async relayCurrentOtpToTelegram(userId: string, chatId: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { telegramChatId: chatId } });
    await this.relayPendingOtp(userId, chatId);
  }

  /**
   * Request OTP for phone number
   */
  async requestOTP(phone: string): Promise<{ sent: boolean; expiresIn: number }> {
    // Normalize phone
    const normalizedPhone = phone.replace(/\D/g, '');

    // Check cooldown
    const cooldownKey = `otp:cooldown:${normalizedPhone}`;
    const hasCooldown = await redis.get(cooldownKey);

    if (hasCooldown) {
      const ttl = await redis.ttl(cooldownKey);
      throw new AppError(`Aguarde ${ttl} segundos para solicitar novo código`, 429);
    }

    // Find user by phone
    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
      include: { business: true },
    });

    if (!user) {
      // Don't reveal if user exists or not
      logger.info({ phone: normalizedPhone }, 'OTP requested for non-existent user');
      // Simulate success for security
      return { sent: true, expiresIn: this.OTP_EXPIRY_MINUTES * 60 };
    }

    const otp = await this.issueOtp(user.id, normalizedPhone);

    await this.notifyUser(
      user,
      `🔐 Seu código de acesso bela360:\n\n*${otp}*\n\nVálido por ${this.OTP_EXPIRY_MINUTES} minutos.\n\nSe você não solicitou este código, ignore esta mensagem.`
    );

    logger.info({ phone: normalizedPhone }, 'OTP sent successfully');

    return { sent: true, expiresIn: this.OTP_EXPIRY_MINUTES * 60 };
  }

  /**
   * Chamado logo apos o cadastro (BusinessService.create) - manda boas-vindas
   * + o primeiro codigo de acesso numa unica mensagem, pra dono novo nao
   * precisar descobrir sozinho que precisa ir em "Entrar com codigo do
   * WhatsApp". Nunca lanca erro: cadastro nao pode falhar por causa disso
   * (mesma tolerancia do requestOTP se a instancia de sistema estiver fora).
   */
  async sendWelcomeOtp(userId: string, phone: string, businessName: string): Promise<void> {
    const normalizedPhone = phone.replace(/\D/g, '');
    const otp = await this.issueOtp(userId, normalizedPhone);

    await this.notifyUser(
      { id: userId, phone: normalizedPhone, telegramChatId: null },
      `🎉 Bem-vindo(a) ao bela360, ${businessName}!\n\nSeu código de acesso:\n\n*${otp}*\n\nVálido por ${this.OTP_EXPIRY_MINUTES} minutos. Use esse número de telefone pra entrar na sua conta em bela360.wayia.com.br/login.`
    );
  }

  /**
   * Verify OTP and return tokens
   */
  async verifyOTP(phone: string, otp: string): Promise<AuthTokens> {
    const normalizedPhone = phone.replace(/\D/g, '');

    // Find user
    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
      include: { business: true },
    });

    if (!user) {
      throw new AppError('Credenciais inválidas', 401);
    }

    // Check OTP
    const isValidOTP =
      user.otpCode === otp && user.otpExpiresAt && user.otpExpiresAt > new Date();

    // Also check Redis backup
    const redisOTP = await redis.get(`otp:${normalizedPhone}`);
    const isValidRedisOTP = redisOTP === otp;

    if (!isValidOTP && !isValidRedisOTP) {
      // Track failed attempts
      const attemptsKey = `otp:attempts:${normalizedPhone}`;
      const attempts = await redis.incr(attemptsKey);
      await redis.expire(attemptsKey, 300); // 5 minutes

      if (attempts >= 5) {
        // Lock for 15 minutes
        await redis.setex(`otp:locked:${normalizedPhone}`, 900, '1');
        throw new AppError('Muitas tentativas. Tente novamente em 15 minutos.', 429);
      }

      throw new AppError('Código inválido ou expirado', 401);
    }

    // Clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        lastLoginAt: new Date(),
      },
    });

    // Clear Redis keys
    await redis.del(`otp:${normalizedPhone}`);
    await redis.del(`otp:attempts:${normalizedPhone}`);

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      businessId: user.businessId,
      role: user.role,
    });

    // Store refresh token
    await redis.setex(
      `refresh:${user.id}`,
      7 * 24 * 60 * 60, // 7 days
      tokens.refreshToken
    );

    logger.info({ userId: user.id }, 'User logged in successfully');

    return tokens;
  }

  /**
   * Login with phone + password (fallback that does not depend on WhatsApp delivery)
   */
  async loginWithPassword(phone: string, password: string): Promise<AuthTokens> {
    const normalizedPhone = phone.replace(/\D/g, '');

    const lockKey = `password:locked:${normalizedPhone}`;
    if (await redis.get(lockKey)) {
      throw new AppError('Muitas tentativas. Tente novamente em 15 minutos.', 429);
    }

    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
    });

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      const attemptsKey = `password:attempts:${normalizedPhone}`;
      const attempts = await redis.incr(attemptsKey);
      await redis.expire(attemptsKey, 300);

      if (attempts >= 5) {
        await redis.setex(lockKey, 900, '1');
      }

      throw new AppError('Telefone ou senha inválidos', 401);
    }

    if (!user.isActive) {
      throw new AppError('Usuário inativo', 401);
    }

    await redis.del(`password:attempts:${normalizedPhone}`);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.generateTokens({
      userId: user.id,
      businessId: user.businessId,
      role: user.role,
    });

    await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

    logger.info({ userId: user.id }, 'User logged in successfully via password');

    return tokens;
  }

  /**
   * Atualiza os dados basicos do proprio usuario logado (nome/email/avatar).
   * Telefone nao entra aqui de proposito: e a chave de login (OTP/senha) e de
   * unicidade por negocio, trocar exige um fluxo proprio de verificacao.
   */
  async updateProfile(
    userId: string,
    data: { name?: string; email?: string | null; avatarUrl?: string | null }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    logger.info({ userId }, 'Perfil atualizado');
    return user;
  }

  /**
   * Define/troca a senha do usuario logado. Se ja existir uma senha, exige a
   * atual pra trocar (evita que uma sessao roubada troque a senha sem saber a
   * antiga). Se ainda nao existir (conta so com OTP), define direto.
   */
  async setPassword(userId: string, currentPassword: string | undefined, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    if (user.passwordHash) {
      if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
        throw new AppError('Senha atual incorreta', 401);
      }
    }

    const passwordHash = hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    logger.info({ userId }, 'Senha atualizada pelo usuário');
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;

      // Check if refresh token is still valid in Redis
      const storedToken = await redis.get(`refresh:${payload.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new AppError('Token de atualização inválido', 401);
      }

      // Get user to verify still active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.isActive) {
        throw new AppError('Usuário não encontrado ou inativo', 401);
      }

      // Generate new tokens
      const tokens = this.generateTokens({
        userId: user.id,
        businessId: user.businessId,
        role: user.role,
      });

      // Update refresh token in Redis
      await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expirado', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Token inválido', 401);
      }
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    await redis.del(`refresh:${userId}`);
    logger.info({ userId }, 'User logged out');
  }

  /**
   * Validate access token
   */
  validateToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expirado', 401);
      }
      throw new AppError('Token inválido', 401);
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    // Parse expiry for response
    const expiresIn = this.parseExpiryToSeconds(env.JWT_EXPIRES_IN);

    return { accessToken, refreshToken, expiresIn };
  }

  /**
   * Parse JWT expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 3600;
      case 'd':
        return num * 86400;
      default:
        return 3600;
    }
  }
}

export const authService = new AuthService();
