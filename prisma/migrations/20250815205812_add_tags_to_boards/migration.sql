-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
