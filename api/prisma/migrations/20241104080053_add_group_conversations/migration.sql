/*
  Warnings:

  - You are about to drop the column `subject` on the `Conversation` table. All the data in the column will be lost.
  - Made the column `conversationId` on table `Message` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_recipientId_fkey";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "subject",
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "recipientId" DROP NOT NULL,
ALTER COLUMN "conversationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
