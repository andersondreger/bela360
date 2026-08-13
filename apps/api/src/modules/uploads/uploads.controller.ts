import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { env } from '../../config';
import { AppError } from '../../common/errors';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Dev roda com cwd=/app (raiz do monorepo); produção roda "node apps/api/dist/server.js" também a partir de /app.
// Em ambos os casos apps/api/uploads fica no mesmo lugar relativo ao processo.
const UPLOAD_DIR = path.join(process.cwd(), 'apps/api/uploads');

export class UploadsController {
  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError('Nenhum arquivo enviado', 400);
      }

      const businessId = req.user!.businessId;
      const ext = EXT_BY_MIME[file.mimetype] || 'jpg';
      const filename = `${businessId}-${randomUUID()}.${ext}`;

      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);

      const url = `${env.API_URL}/api/uploads/${filename}`;

      res.status(201).json({ success: true, data: { url } });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadsController = new UploadsController();
