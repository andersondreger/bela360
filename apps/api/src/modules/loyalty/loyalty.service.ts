import { prisma, logger } from '../../config';
import { sendQueue } from '../whatsapp/whatsapp.queue';

const TIER_LABELS: Record<string, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  DIAMOND: 'Diamante',
};

/**
 * Concede pontos (ou cashback) de fidelidade automaticamente quando um pagamento é
 * registrado, e avisa o cliente pelo WhatsApp — antes disso o programa de fidelidade
 * nunca era alimentado automaticamente nem se conectava a nenhum envio de mensagem.
 */
export async function awardPointsForPayment(
  businessId: string,
  clientId: string,
  amount: number,
  appointmentId?: string
): Promise<void> {
  try {
    const program = await prisma.loyaltyProgram.findUnique({ where: { businessId } });
    if (!program || !program.isActive) return;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return;

    const pointsToAdd = Math.floor(amount * Number(program.pointsPerReal));
    if (pointsToAdd <= 0) return;

    let loyaltyPoints = await prisma.loyaltyPoints.findUnique({ where: { clientId } });
    if (!loyaltyPoints) {
      loyaltyPoints = await prisma.loyaltyPoints.create({ data: { businessId, clientId } });
    }

    const previousTier = loyaltyPoints.currentTier;
    const newBalance = loyaltyPoints.currentPoints + pointsToAdd;

    let newTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' = 'BRONZE';
    if (newBalance >= program.diamondThreshold) newTier = 'DIAMOND';
    else if (newBalance >= program.goldThreshold) newTier = 'GOLD';
    else if (newBalance >= program.silverThreshold) newTier = 'SILVER';

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + program.pointsExpirationMonths);

    await prisma.$transaction([
      prisma.loyaltyPoints.update({
        where: { id: loyaltyPoints.id },
        data: {
          currentPoints: newBalance,
          totalEarned: { increment: pointsToAdd },
          currentTier: newTier,
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          loyaltyPointsId: loyaltyPoints.id,
          type: 'EARNED',
          points: pointsToAdd,
          balance: newBalance,
          appointmentId,
          description: `Pontos ganhos - R$${amount.toFixed(2)}`,
          expiresAt,
        },
      }),
    ]);

    const tierUpgraded = newTier !== previousTier;
    const rewardsCount = await prisma.loyaltyReward.count({
      where: { programId: program.id, isActive: true, pointsCost: { lte: newBalance } },
    });

    let message = `${client.name}, você ganhou ${pointsToAdd} pontos de fidelidade! Seu saldo agora é ${newBalance} pontos.`;
    if (tierUpgraded) {
      message += ` 🎉 Você subiu pro nível ${TIER_LABELS[newTier] || newTier}!`;
    }
    if (rewardsCount > 0) {
      message += ` Você já tem recompensa disponível pra resgatar — dá uma olhada na sua próxima visita.`;
    }

    await sendQueue.add('send-message', { businessId, phone: client.phone, message });

    logger.info({ clientId, pointsToAdd, newBalance, newTier, tierUpgraded }, 'Loyalty points awarded and client notified');
  } catch (err) {
    logger.error({ err, clientId, businessId }, 'Failed to award loyalty points for payment');
  }
}

/**
 * Avisa o cliente pelo WhatsApp com o cupom assim que uma recompensa é resgatada —
 * sem isso o código só existia na tela do dono, o cliente nunca recebia.
 */
export async function notifyRedemption(
  businessId: string,
  clientId: string,
  rewardName: string,
  couponCode: string,
  expiresAt: Date
): Promise<void> {
  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return;

    const message = `${client.name}, sua recompensa "${rewardName}" foi resgatada! 🎁\n\nSeu cupom: *${couponCode}*\nVálido até ${expiresAt.toLocaleDateString('pt-BR')}.\n\nApresente esse código na hora de pagar.`;

    await sendQueue.add('send-message', { businessId, phone: client.phone, message });
  } catch (err) {
    logger.error({ err, clientId, businessId }, 'Failed to notify loyalty redemption');
  }
}
