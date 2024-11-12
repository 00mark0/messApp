-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "seenBy" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
