-- Add optional password login fallback, independent of WhatsApp OTP delivery
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
