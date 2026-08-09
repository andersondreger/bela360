import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from './auth.controller';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { RateLimitError } from '../../common/errors';

const router: Router = Router();

// Stricter than the global API limiter: these endpoints gate account access
// (OTP brute-force, password brute-force), so they get their own tight budget.
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new RateLimitError()),
});

// Public routes
router.post('/otp/request', authAttemptLimiter, (req, res, next) => authController.requestOTP(req, res, next));
router.post('/otp/verify', authAttemptLimiter, (req, res, next) => authController.verifyOTP(req, res, next));
router.post('/login', authAttemptLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/telegram/link', authAttemptLimiter, (req, res, next) => authController.requestTelegramLink(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));

// Protected routes
router.post('/logout', authMiddleware, (req, res, next) => authController.logout(req, res, next));
router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

export { router as authRoutes };
