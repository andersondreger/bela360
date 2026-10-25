import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Evolution API
  EVOLUTION_API_URL: z.string().url().default('http://localhost:8080'),
  EVOLUTION_API_KEY: z.string(),
  EVOLUTION_INSTANCE_NAME: z.string().default('bela360'),
  // Numero que dispara a 1a mensagem (prospeccao + boas-vindas + OTP) — o
  // numero pessoal do Anderson. Numero que atende o cliente depois (Ana
  // respondendo inbound) — numero institucional da Bela. Enquanto for um
  // numero so, ambos caem em EVOLUTION_INSTANCE_NAME (default abaixo).
  EVOLUTION_OUTREACH_INSTANCE_NAME: z.string().optional(),
  EVOLUTION_SUPPORT_INSTANCE_NAME: z.string().optional(),
  // Numero publico de atendimento no formato E.164 sem "+" (ex: 5545991397543),
  // usado nos links wa.me da landing / login / onboarding.
  SUPPORT_WHATSAPP_NUMBER: z.string().optional(),

  // Teste completo gratis antes de exigir assinatura (dias)
  TRIAL_DAYS: z.coerce.number().default(7),

  // Anthropic (Ana — atendimento comercial via WhatsApp/Telegram)
  ANTHROPIC_API_KEY: z.string(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5'),

  // Telegram (canal alternativo pra Ana enquanto o WhatsApp institucional
  // nao esta conectado — opcional ate ter um bot configurado)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().default('Bela360bot'),

  // Chat ID do Telegram do Anderson (dono da plataforma) pra alertas
  // operacionais - independe de qual conta de usuario tem isSuperAdmin,
  // porque nenhuma conta superadmin hoje tem Telegram vinculado.
  ADMIN_TELEGRAM_CHAT_ID: z.string().optional(),

  // URLs
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Asaas (cobranca da assinatura SaaS do bela360) — opcional ate ter conta real
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  ASAAS_SUBSCRIPTION_VALUE: z.coerce.number().default(97),

  // Marketplace: "simulado" (Fase 1, pagamento confirmado por botao) ou "asaas" (Fase 2).
  MARKETPLACE_GATEWAY: z.enum(['simulado', 'asaas']).default('simulado'),
  // Token do servico do wayia.com.br (payments-api) que opera a visao CEO. Sem ele, so super admin logado.
  MARKETPLACE_SERVICE_TOKEN: z.string().min(24).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
