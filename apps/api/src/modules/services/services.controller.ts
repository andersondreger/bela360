import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { servicesService } from './services.service';

const createServiceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  duration: z.number().min(5).max(480), // 5 min to 8 hours
  price: z.number().min(0),
  professionalIds: z.array(z.string().cuid()).optional(),
});

const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export class ServicesController {
  /**
   * Create new service
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const data = createServiceSchema.parse(req.body);
      const service = await servicesService.create({ businessId, ...data });

      res.status(201).json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all services
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { includeInactive } = req.query;
      const services = await servicesService.getAll(
        businessId,
        includeInactive === 'true'
      );

      res.json({
        success: true,
        data: services,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get service by ID
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { id } = req.params;
      const service = await servicesService.getById(businessId, id);

      res.json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update service
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { id } = req.params;
      const data = updateServiceSchema.parse(req.body);
      const service = await servicesService.update(businessId, id, data);

      res.json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete service
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { id } = req.params;
      await servicesService.delete(businessId, id);

      res.json({
        success: true,
        message: 'Serviço removido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get services by professional
   */
  async getByProfessional(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { professionalId } = req.params;
      const services = await servicesService.getByProfessional(businessId, professionalId);

      res.json({
        success: true,
        data: services,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const servicesController = new ServicesController();
