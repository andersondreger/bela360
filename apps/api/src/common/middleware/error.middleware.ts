import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError, ValidationError } from '../errors';
import { logger } from '../../config';
import type { ApiResponse } from '@bela360/shared';

const MULTER_ERROR_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'Imagem muito grande. Envie um arquivo de até 10MB.',
  LIMIT_UNEXPECTED_FILE: 'Campo de arquivo inesperado.',
};

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void => {
  // Log error
  logger.error(
    {
      error: err,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
    },
    'Request error'
  );

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: err.errors,
      },
    });
    return;
  }

  // Handle file upload errors (multer)
  if (err instanceof MulterError) {
    res.status(400).json({
      success: false,
      error: {
        code: err.code,
        message: MULTER_ERROR_MESSAGES[err.code] || 'Erro ao enviar o arquivo.',
      },
    });
    return;
  }

  // Handle known operational errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err instanceof ValidationError ? err.details : undefined,
      },
    });
    return;
  }

  // Handle unknown errors
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
};
