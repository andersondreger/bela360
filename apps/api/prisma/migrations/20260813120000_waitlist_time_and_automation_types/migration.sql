-- AlterTable
ALTER TABLE "waitlist" ADD COLUMN     "desiredTime" TEXT;

-- AlterEnum
ALTER TYPE "AutomationType" ADD VALUE 'REMINDER_SAME_DAY';
