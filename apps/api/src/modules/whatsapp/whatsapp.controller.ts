import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, logger, env } from '../../config';
import { getWhatsAppService, getSystemWhatsAppService, SYSTEM_INSTANCE_NAME } from './whatsapp.service';
import { messageQueue } from './whatsapp.queue';
import { parseWebhookMessage } from './whatsapp.utils';
import { handleAttendantMessage } from './attendant.service';
import { AppError } from '../../common/errors';

// Validation schemas
const sendMessageSchema = z.object({
  phone: z.string().min(10),
  message: z.string().min(1).max(4096),
});

const sendConversationMessageSchema = z.object({
  message: z.string().min(1).max(4096),
});

function requireSystemApiKey(req: Request): void {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (apiKey !== env.EVOLUTION_API_KEY) {
    throw new AppError('API key invalida', 401);
  }
}

export class WhatsAppController {
  /**
   * Setup system WhatsApp instance (for OTP and system messages)
   */
  async setupSystemInstance(req: Request, res: Response, next: NextFunction) {
    try {
      // Simple API key check for setup endpoint
      const apiKey = req.headers['x-api-key'] || req.query.apiKey;
      if (apiKey !== env.EVOLUTION_API_KEY) {
        throw new AppError('API key invalida', 401);
      }

      const systemWhatsApp = getSystemWhatsAppService();

      // Create instance if not exists
      await systemWhatsApp.createInstance();

      // Configure webhook
      const webhookUrl = `${env.API_URL || 'http://localhost:3001'}/api/whatsapp/webhook`;
      await systemWhatsApp.configureWebhook({
        url: webhookUrl,
        events: ['CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      });

      // Get QR code
      const qrcode = await systemWhatsApp.getQRCode();

      res.json({
        success: true,
        data: {
          instanceName: SYSTEM_INSTANCE_NAME,
          qrcode,
          status: 'awaiting_scan',
          message: 'Escaneie o QR Code com o WhatsApp que sera usado para enviar OTPs do sistema',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system instance status
   */
  async getSystemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      requireSystemApiKey(req);
    } catch (error) {
      return next(error);
    }

    try {
      const systemWhatsApp = getSystemWhatsAppService();
      const status = await systemWhatsApp.getInstanceStatus();

      res.json({
        success: true,
        data: {
          instanceName: SYSTEM_INSTANCE_NAME,
          state: status.state,
          connected: status.state === 'open',
        },
      });
    } catch (error) {
      // Instance might not exist yet
      res.json({
        success: true,
        data: {
          instanceName: SYSTEM_INSTANCE_NAME,
          state: 'not_configured',
          connected: false,
        },
      });
    }
  }

  /**
   * Get system instance QR code
   */
  async getSystemQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      requireSystemApiKey(req);
      const systemWhatsApp = getSystemWhatsAppService();
      const qrcode = await systemWhatsApp.getQRCode();

      res.json({
        success: true,
        data: { qrcode },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Connect WhatsApp instance for a business
   */
  async connectInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;

      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        throw new AppError('Business not found', 404);
      }

      const instanceName = `bela360_${business.slug}`;
      const whatsapp = getWhatsAppService(instanceName);

      // Create instance if not exists
      await whatsapp.createInstance();

      // Se a instancia ja esta pareada (aberta), pedir um QR novo pra ela
      // nao devolve nada pra escanear - a Evolution simplesmente nao manda
      // base64 porque nao ha handshake pendente. Sem esse check, o front
      // ficava preso pra sempre no spinner "Aguardando leitura do QR Code"
      // (nunca recebia QR nem confirmacao) e ainda marcava o negocio como
      // desconectado no banco mesmo estando conectado de verdade - bug real
      // reportado pelo Anderson em 2026-08-08.
      const currentStatus = await whatsapp.getInstanceStatus();
      if (currentStatus.state === 'open') {
        if (!business.whatsappConnected) {
          await prisma.business.update({
            where: { id: businessId },
            data: { whatsappInstanceId: instanceName, whatsappConnected: true, whatsappConnectedAt: new Date() },
          });
        }
        res.json({
          success: true,
          data: { instanceName, qrcode: null, status: 'already_connected' },
        });
        return;
      }

      // Configure webhook
      const webhookUrl = `${process.env.API_URL}/api/whatsapp/webhook`;
      await whatsapp.configureWebhook({
        url: webhookUrl,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      });

      // Get QR code
      const qrcode = await whatsapp.getQRCode();

      // Update business with instance info
      await prisma.business.update({
        where: { id: businessId },
        data: {
          whatsappInstanceId: instanceName,
          whatsappConnected: false,
        },
      });

      res.json({
        success: true,
        data: {
          instanceName,
          qrcode,
          status: 'awaiting_scan',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get connection status
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;

      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business || !business.whatsappInstanceId) {
        throw new AppError('WhatsApp not configured for this business', 404);
      }

      const whatsapp = getWhatsAppService(business.whatsappInstanceId);
      const status = await whatsapp.getInstanceStatus();

      // A flag whatsappConnected no banco pode ficar desatualizada em
      // relacao ao estado real da instancia (ex: webhook perdido, ou o bug
      // do connectInstance corrigido em 2026-08-08 que zerava a flag sem
      // necessidade) - reconcilia aqui pra "connected" sempre refletir o
      // que a Evolution diz agora, nao um snapshot antigo.
      const reallyConnected = status.state === 'open';
      if (reallyConnected !== business.whatsappConnected) {
        await prisma.business.update({
          where: { id: businessId },
          data: {
            whatsappConnected: reallyConnected,
            whatsappConnectedAt: reallyConnected ? (business.whatsappConnectedAt ?? new Date()) : null,
          },
        });
      }

      res.json({
        success: true,
        data: {
          connected: reallyConnected,
          state: status.state,
          connectedAt: reallyConnected ? business.whatsappConnectedAt : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get new QR code
   */
  async getQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;

      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business || !business.whatsappInstanceId) {
        throw new AppError('WhatsApp not configured for this business', 404);
      }

      const whatsapp = getWhatsAppService(business.whatsappInstanceId);
      const qrcode = await whatsapp.getQRCode();

      res.json({
        success: true,
        data: { qrcode },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send message
   */
  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { phone, message } = sendMessageSchema.parse(req.body);

      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business || !business.whatsappInstanceId) {
        throw new AppError('WhatsApp not configured for this business', 404);
      }

      if (!business.whatsappConnected) {
        throw new AppError('WhatsApp not connected', 400);
      }

      const whatsapp = getWhatsAppService(business.whatsappInstanceId);
      const result = await whatsapp.sendText({ number: phone, text: message });

      // Save message to database
      await prisma.message.create({
        data: {
          businessId,
          remoteJid: phone,
          direction: 'OUTBOUND',
          content: message,
          status: 'SENT',
          sentAt: new Date(),
          isFromBot: false,
        },
      });

      res.json({
        success: true,
        data: { messageId: result.messageId },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disconnect WhatsApp
   */
  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;

      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business || !business.whatsappInstanceId) {
        throw new AppError('WhatsApp not configured for this business', 404);
      }

      const whatsapp = getWhatsAppService(business.whatsappInstanceId);
      await whatsapp.logout();

      await prisma.business.update({
        where: { id: businessId },
        data: {
          whatsappConnected: false,
          whatsappConnectedAt: null,
        },
      });

      res.json({
        success: true,
        message: 'WhatsApp disconnected',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Evolution API webhook
   */
  async handleWebhook(req: Request, res: Response, _next: NextFunction) {
    try {
      const { event, instance, data } = req.body;

      logger.debug({ event, instance }, 'Webhook received');

      // bela360_system nao pertence a nenhum negocio - e a Ana, atendimento
      // comercial do proprio bela360 (landing page "Falar com a gente").
      if (instance === SYSTEM_INSTANCE_NAME) {
        if (event === 'messages.upsert') {
          const messages = Array.isArray(data) ? data : [data];
          for (const msg of messages) {
            if (msg.key?.fromMe) continue;
            const parsed = parseWebhookMessage(msg);
            if (parsed?.text) {
              await handleAttendantMessage(parsed.phoneNumber, parsed.text);
            }
          }
        }
        return res.sendStatus(200);
      }

      // Find business by instance
      const business = await prisma.business.findFirst({
        where: { whatsappInstanceId: instance },
      });

      if (!business) {
        logger.warn({ instance }, 'Business not found for webhook instance');
        return res.sendStatus(200);
      }

      switch (event) {
        case 'connection.update':
          await this.handleConnectionUpdate(business.id, data);
          break;

        case 'messages.upsert':
          await this.handleMessageReceived(business.id, data);
          break;

        case 'messages.update':
          await this.handleMessageUpdate(business.id, data);
          break;

        case 'qrcode.updated':
          logger.info({ businessId: business.id }, 'QR Code updated');
          break;

        default:
          logger.debug({ event }, 'Unhandled webhook event');
      }

      res.sendStatus(200);
    } catch (error) {
      logger.error({ error }, 'Webhook error');
      res.sendStatus(200); // Always return 200 to Evolution API
    }
  }

  /**
   * Handle connection status changes
   */
  private async handleConnectionUpdate(businessId: string, data: any) {
    const { state } = data;

    if (state === 'open') {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          whatsappConnected: true,
          whatsappConnectedAt: new Date(),
        },
      });
      logger.info({ businessId }, 'WhatsApp connected');
    } else if (state === 'close') {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          whatsappConnected: false,
        },
      });
      logger.info({ businessId }, 'WhatsApp disconnected');
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessageReceived(businessId: string, data: any) {
    const messages = Array.isArray(data) ? data : [data];

    for (const msg of messages) {
      // Skip messages sent by us
      if (msg.key?.fromMe) continue;

      const parsed = parseWebhookMessage(msg);
      if (!parsed) continue;

      // Find or create client
      let client = await prisma.client.findFirst({
        where: {
          businessId,
          phone: parsed.phoneNumber,
        },
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            businessId,
            phone: parsed.phoneNumber,
            name: parsed.pushName || 'Novo Cliente',
          },
        });
      }

      // Save message
      await prisma.message.create({
        data: {
          businessId,
          clientId: client.id,
          whatsappMessageId: parsed.messageId,
          remoteJid: parsed.remoteJid,
          direction: 'INBOUND',
          content: parsed.text,
          mediaUrl: parsed.mediaUrl,
          mediaType: parsed.mediaType,
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });

      // Add to processing queue
      await messageQueue.add('process-message', {
        businessId,
        clientId: client.id,
        messageId: parsed.messageId,
        text: parsed.text,
        buttonResponse: parsed.buttonResponse,
        listResponse: parsed.listResponse,
      });
    }
  }

  /**
   * Handle message status updates
   */
  private async handleMessageUpdate(businessId: string, data: any) {
    const updates = Array.isArray(data) ? data : [data];

    for (const update of updates) {
      const { key, update: statusUpdate } = update;
      if (!key?.id || !statusUpdate?.status) continue;

      const statusMap: Record<string, string> = {
        PENDING: 'PENDING',
        SENT: 'SENT',
        DELIVERED: 'DELIVERED',
        READ: 'READ',
        PLAYED: 'READ',
      };

      const status = statusMap[statusUpdate.status];
      if (!status) continue;

      await prisma.message.updateMany({
        where: {
          businessId,
          whatsappMessageId: key.id,
        },
        data: {
          status: status as any,
          ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
          ...(status === 'READ' && { readAt: new Date() }),
        },
      });
    }
  }

  /**
   * List conversations (one per client with messages), most recent first
   */
  async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;

      const withMessages = await prisma.message.findMany({
        where: { businessId, clientId: { not: null } },
        select: { clientId: true },
        distinct: ['clientId'],
      });

      const clientIds = withMessages.map(m => m.clientId as string);

      const conversations = await Promise.all(
        clientIds.map(async clientId => {
          const [client, lastMessage, unreadCount] = await Promise.all([
            prisma.client.findFirst({
              where: { id: clientId, businessId },
              select: { id: true, name: true, phone: true },
            }),
            prisma.message.findFirst({
              where: { businessId, clientId },
              orderBy: { createdAt: 'desc' },
            }),
            prisma.message.count({
              where: { businessId, clientId, direction: 'INBOUND', readAt: null },
            }),
          ]);

          return { client, lastMessage, unreadCount };
        })
      );

      conversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
        const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
        return bTime - aTime;
      });

      res.json({ success: true, data: conversations.filter(c => c.client) });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get message history with a client (marks inbound messages as read)
   */
  async getConversationMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { clientId } = req.params;

      const client = await prisma.client.findFirst({ where: { id: clientId, businessId } });
      if (!client) {
        throw new AppError('Cliente não encontrado', 404);
      }

      const messages = await prisma.message.findMany({
        where: { businessId, clientId },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });

      await prisma.message.updateMany({
        where: { businessId, clientId, direction: 'INBOUND', readAt: null },
        data: { readAt: new Date(), status: 'READ' },
      });

      res.json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a message within a client conversation thread
   */
  async sendConversationMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { clientId } = req.params;
      const { message } = sendConversationMessageSchema.parse(req.body);

      const client = await prisma.client.findFirst({ where: { id: clientId, businessId } });
      if (!client) {
        throw new AppError('Cliente não encontrado', 404);
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business?.whatsappInstanceId || !business.whatsappConnected) {
        throw new AppError('WhatsApp não conectado', 400);
      }

      const whatsapp = getWhatsAppService(business.whatsappInstanceId);
      await whatsapp.sendText({ number: client.phone, text: message });

      const created = await prisma.message.create({
        data: {
          businessId,
          clientId,
          remoteJid: client.phone,
          direction: 'OUTBOUND',
          content: message,
          status: 'SENT',
          sentAt: new Date(),
          isFromBot: false,
        },
      });

      res.json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }
}

export const whatsappController = new WhatsAppController();
