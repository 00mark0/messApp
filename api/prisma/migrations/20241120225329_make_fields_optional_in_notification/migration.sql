/*
  Warnings:

  - You are about to drop the column `seenTimestamps` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Message" DROP COLUMN "seenTimestamps";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "conversationId" INTEGER,
ADD COLUMN     "messageId" INTEGER;

-- CreateIndex
CREATE INDEX "Conversation_name_idx" ON "Conversation"("name");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_conversationId_idx" ON "Notification"("conversationId");

-- CreateIndex
CREATE INDEX "Notification_messageId_idx" ON "Notification"("messageId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
