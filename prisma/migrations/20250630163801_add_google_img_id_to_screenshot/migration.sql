/*
  Warnings:

  - Added the required column `googleImageId` to the `Screenshots` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable

-- Add some dummy data for exisiting rows because the column is not nullable and we are adding it without a default value.
ALTER TABLE "Screenshots"
ADD COLUMN "googleImageId" TEXT;

UPDATE "Screenshots"
SET "googleImageId" = 'DEFAULT_ID';

ALTER TABLE "Screenshots"
ALTER COLUMN "googleImageId" SET NOT NULL;
