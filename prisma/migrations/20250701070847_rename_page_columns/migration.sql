/*
  Warnings:

  - You are about to drop the column `viewportWidth` on the `Screenshots` table. All the data in the column will be lost.
  - You are about to drop the column `viewportHeight` on the `Screenshots` table. All the data in the column will be lost.
  - Added the required column `viewportHeight` to the `Screenshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `viewportWidth` to the `Screenshots` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Screenshots" RENAME COLUMN "viewportWidth" TO "viewportWidth";
ALTER TABLE "Screenshots" RENAME COLUMN "viewportHeight" TO "viewportHeight";
