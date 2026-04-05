-- AlterTable
ALTER TABLE "Account" ADD COLUMN "lastSynced" DATETIME;
ALTER TABLE "Account" ADD COLUMN "plaidAccessToken" TEXT;
ALTER TABLE "Account" ADD COLUMN "plaidAccountId" TEXT;
ALTER TABLE "Account" ADD COLUMN "plaidItemId" TEXT;
