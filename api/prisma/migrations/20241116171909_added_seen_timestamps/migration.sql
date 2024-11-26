-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "seenTimestamps" JSONB NOT NULL DEFAULT '{}';
