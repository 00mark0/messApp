/*
  Warnings:

  - You are about to drop the column `conversationId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `Notification` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_messageId_fkey";

-- DropIndex
DROP INDEX "Conversation_name_idx";

-- DropIndex
DROP INDEX "Message_conversationId_idx";

-- DropIndex
DROP INDEX "Notification_conversationId_idx";

-- DropIndex
DROP INDEX "Notification_messageId_idx";

-- DropIndex
DROP INDEX "Notification_userId_idx";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "conversationId",
DROP COLUMN "messageId";
