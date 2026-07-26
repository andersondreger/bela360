import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config';

const router: Router = Router();

const createProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.enum(['RESALE', 'INTERNAL_USE', 'BOTH']).optional(),
  costPrice: z.number().nonnegative(),
  salePrice: z.number().nonnegative().optional(),
  initialStock: z.number().nonnegative().optional(),
  minStock: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  expirationDate: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const stockMovementSchema = z.object({
  type: z.enum(['PURCHASE', 'SALE', 'SERVICE_USE', 'ADJUSTMENT', 'RETURN', 'LOSS', 'EXPIRED']),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  appointmentId: z.string().cuid().optional(),
});

const linkServiceSchema = z.object({
  quantityUsed: z.number().positive(),
});

function fail(res: Response, status: number, message: string, details?: unknown) {
  res.status(status).json({ success: false, error: { message, details } });
}

function handleRouteError(error: unknown, res: Response, fallbackMessage: string) {
  if (error instanceof z.ZodError) {
    return fail(res, 400, 'Dados inválidos', error.errors);
  }
  fail(res, 500, fallbackMessage);
}

// List all products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const businessId = req.user!.businessId;
    const { category, lowStock, search } = req.query;

    const where: any = { businessId };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    if (lowStock === 'true') {
      return res.json({
        success: true,
        data: products.filter(p => Number(p.currentStock) <= Number(p.minStock)),
      });
    }

    res.json({ success: true, data: products });
  } catch (error) {
    handleRouteError(error, res, 'Erro ao buscar produtos');
  }
});

// Get single product
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const businessId = req.user!.businessId;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, businessId },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { name: true } } },
        },
        serviceProducts: {
          include: { service: { select: { name: true } } },
        },
      },
    });

    if (!product) {
      return fail(res, 404, 'Produto não encontrado');
    }

    res.json({ success: true, data: product });
  } catch (error) {
    handleRouteError(error, res, 'Erro ao buscar produto');
  }
});

// Create product
router.post('/products', async (req: Request, res: Response) => {
  try {
    const businessId = req.user!.businessId;
    const data = createProductSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        businessId,
        name: data.name,
        brand: data.brand,
        description: data.description,
        sku: data.sku,
        barcode: data.barcode,
        category: data.category || 'INTERNAL_USE',
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        currentStock: data.initialStock || 0,
        minStock: data.minStock || 0,
        unit: data.unit || 'un',
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        imageUrl: data.imageUrl,
      },
    });

    if (data.initialStock && data.initialStock > 0) {
      await prisma.stockMovement.create({
        data: {
          businessId,
          productId: product.id,
          type: 'PURCHASE',
          quantity: data.initialStock,
          previousStock: 0,
          newStock: data.initialStock,
          unitCost: data.costPrice,
          totalCost: data.costPrice * data.initialStock,
          notes: 'Estoque inicial',
        },
      });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    handleRouteError(error, res, 'Erro ao criar produto');
  }
});

// Update product
router.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const businessId = req.user!.businessId;
    const { id } = req.params;
    const data = updateProductSchema.parse(req.body);

    const existing = await prisma.product.findFirst({ where: { id, businessId } });
    if (!existing) {
      return fail(res, 404, 'Produto não encontrado');
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        brand: data.brand,
        description: data.description,
        sku: data.sku,
        barcode: data.barcode,
        category: data.category,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        minStock: data.minStock,
        unit: data.unit,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
      },
    });

    res.json({ success: true, data: product });
  } catch (error) {
    handleRouteError(error, res, 'Erro ao atualizar produto');
  }
});

// Stock movement
router.post('/products/:id/movement', async (req: Request, res: Response) => {
  try {
    const businessId = req.user!.businessId;
    const userId = req.user!.userId;
    const { id } = req.params;
    const { type, quantity, unitCost, notes, appointmentId } = stockMovementSchema.parse(req.body);

    const product = await prisma.product.findFirst({
      where: { id, businessId },
    });

    if (!product) {
      return fail(res, 404, 'Produto não encontrado');
    }

    const isIncoming = ['PURCHASE', 'RETURN', 'ADJUSTMENT'].includes(type) && quantity > 0;
    const quantityChange = isIncoming ? Math.abs(quantity) : -Math.abs(quantity);
    const newStock = Number(product.currentStock) + quantityChange;

    if (newStock < 0) {
      return fail(res, 400, 'Estoque insuficiente');
    }

    const [movement, updatedProduct] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          businessId,
          productId: id,
          type,
          quantity: quantityChange,
          previousStock: Number(product.currentStock),
          newStock,
          unitCost: unitCost || Number(product.costPrice),
          totalCost: (unitCost || Number(product.costPrice)) * Math.abs(quantity),
          notes,
          appointmentId,
          userId,
        },
      }),
      prisma.product.update({
        where: { id },
        data: { currentStock: newStock },
      }),
    ]);

    res.json({ success: true, data: { movement, product: updatedProduct } });
  } catch (error) {
    handleRouteError(error, res, 'Erro ao registrar movimentação');
  }
});

// Link product to service
router.post('/products/:productId/services/:serviceId', async (req: Request, res: Response) => {
  try {
    const businessId = req.user!.businessId;
    const { productId, serviceId } = req.params;
    const { quantityUsed } = linkServiceSchema.parse(req.body);

    const [product, service] = await Promise.all([
      prisma.product.findFirst({ where: { id: productId, businessId } }),
      prisma.service.findFirst({ where: { id: serviceId, businessId } }),
    ]);

    if (!product || !service) {
      return fail(res, 404, 'Produto ou serviço não encontrado');
    }

    const serviceProduct = await prisma.serviceProduct.upsert({
      where: { serviceId_productId: { serviceId, productId } },
      create: { serviceId, productId, quantityUsed },
      update: { quantityUsed },
    });

    res.json({ success: true, data: serviceProduct });
  } catch (error) {
    handleRouteError(error, res, 'Erro ao vincular produto');
  }
});

// Remove product from service
router.delete('/products/:productId/services/:serviceId', async (req: Request, res: Response) => {
  try {
    const businessId = req.user!.businessId;
    const { productId, serviceId } = req.params;

    const product = await prisma.product.findFirst({ where: { id: productId, businessId } });
    if (!product) {
      return fail(res, 404, 'Produto não encontrado');
    }

    await prisma.serviceProduct.delete({
      where: { serviceId_productId: { serviceId, productId } },
    });

    res.json({ success: true, data: { removed: true } });
  } catch (error) {
    handleRouteError(error, res, 'Erro ao desvincular produto');
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', async (req: Request, res: Response) => {
  try {
    const businessId = req.user!.businessId;

    const products = await prisma.product.findMany({
      where: { businessId, isActive: true },
    });

    const lowStock = products.filter(p => Number(p.currentStock) <= Number(p.minStock));
    const expiringSoon = products.filter(p => {
      if (!p.expirationDate) return false;
      const daysUntilExpiry = Math.ceil(
        (p.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    });

    res.json({ success: true, data: { lowStock, expiringSoon } });
  } catch (error) {
    handleRouteError(error, res, 'Erro ao buscar alertas');
  }
});

// Inventory stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const businessId = req.user!.businessId;

    const [products, movements] = await Promise.all([
      prisma.product.findMany({
        where: { businessId, isActive: true },
      }),
      prisma.stockMovement.findMany({
        where: {
          businessId,
          createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
        },
      }),
    ]);

    const totalProducts = products.length;
    const lowStockCount = products.filter(p => Number(p.currentStock) <= Number(p.minStock)).length;
    const totalStockValue = products.reduce(
      (sum, p) => sum + Number(p.currentStock) * Number(p.costPrice),
      0
    );

    const purchaseTotal = movements
      .filter(m => m.type === 'PURCHASE')
      .reduce((sum, m) => sum + Number(m.totalCost || 0), 0);
    const usageTotal = movements
      .filter(m => m.type === 'SERVICE_USE')
      .reduce((sum, m) => sum + Math.abs(Number(m.totalCost || 0)), 0);

    const consumptionByProduct = movements
      .filter(m => m.type === 'SERVICE_USE')
      .reduce((acc, m) => {
        acc[m.productId] = (acc[m.productId] || 0) + Math.abs(Number(m.quantity));
        return acc;
      }, {} as Record<string, number>);

    const topConsumed = Object.entries(consumptionByProduct)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([productId, quantity]) => ({
        product: products.find(p => p.id === productId),
        quantity,
      }));

    res.json({
      success: true,
      data: {
        totalProducts,
        lowStockCount,
        totalStockValue,
        monthlyPurchases: purchaseTotal,
        monthlyUsage: usageTotal,
        topConsumed,
      },
    });
  } catch (error) {
    handleRouteError(error, res, 'Erro ao buscar estatísticas');
  }
});

// Stock movement history
router.get('/movements', async (req: Request, res: Response) => {
  try {
    const businessId = req.user!.businessId;
    const { productId, type, startDate, endDate, limit = '50' } = req.query;

    const where: any = { businessId };
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        product: { select: { name: true, unit: true } },
        user: { select: { name: true } },
      },
    });

    res.json({ success: true, data: movements });
  } catch (error) {
    handleRouteError(error, res, 'Erro ao buscar movimentações');
  }
});

export const inventoryRoutes: Router = router;
