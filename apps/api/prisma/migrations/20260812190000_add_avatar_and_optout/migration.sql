-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "optOut" BOOLEAN NOT NULL DEFAULT false;
