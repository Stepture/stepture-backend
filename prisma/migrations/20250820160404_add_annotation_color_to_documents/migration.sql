-- CreateEnum
CREATE TYPE "Color" AS ENUM ('GREEN', 'BLUE', 'YELLOW');

-- AlterTable
ALTER TABLE "Documents" ADD COLUMN     "annotationColor" "Color" NOT NULL DEFAULT 'BLUE';
