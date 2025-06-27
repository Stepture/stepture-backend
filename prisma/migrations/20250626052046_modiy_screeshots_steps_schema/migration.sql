/*
  Warnings:

  - You are about to drop the column `description` on the `Steps` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Steps` table. All the data in the column will be lost.
  - Added the required column `devicePixelRatio` to the `Screenshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pageX` to the `Screenshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pageY` to the `Screenshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `viewportX` to the `Screenshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `viewportY` to the `Screenshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stepDescription` to the `Steps` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stepNumber` to the `Steps` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Screenshots" ADD COLUMN     "devicePixelRatio" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "pageX" INTEGER NOT NULL,
ADD COLUMN     "pageY" INTEGER NOT NULL,
ADD COLUMN     "viewportX" INTEGER NOT NULL,
ADD COLUMN     "viewportY" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Steps" DROP COLUMN "description",
DROP COLUMN "title",
ADD COLUMN     "stepDescription" TEXT NOT NULL,
ADD COLUMN     "stepNumber" INTEGER NOT NULL;
