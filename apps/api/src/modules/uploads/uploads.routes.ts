import { Router } from 'express';
import multer from 'multer';
import { AppError } from '../../common/errors';
import { uploadsController } from './uploads.controller';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError('Envie uma imagem JPG, PNG ou WEBP', 400));
      return;
    }
    cb(null, true);
  },
});

const router: Router = Router();

// authMiddleware é aplicado no app.ts ao montar este router
router.post('/image', upload.single('file'), (req, res, next) => uploadsController.uploadImage(req, res, next));

export { router as uploadsRoutes };
