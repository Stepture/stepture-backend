-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "encryptedGeminiKey" TEXT,
ADD COLUMN     "geminiKeyHash" TEXT,
ADD COLUMN     "geminiKeyIv" TEXT,
ADD COLUMN     "geminiKeySalt" TEXT,
ADD COLUMN     "hasCustomApiKey" BOOLEAN NOT NULL DEFAULT false;
