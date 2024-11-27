// api/utils/cleanup.js

import fs from "fs";
import path from "path";
import cron from "node-cron";
import { dirname } from "path";
import { fileURLToPath } from "url";
import prisma from "./prismaClient.js";

// Define __dirname since it's not available in ES Modules
const __dirname = dirname(fileURLToPath(import.meta.url));


/**
 * Deletes a file asynchronously.
 * @param {string} filePath - The absolute path to the file.
 */
const deleteFile = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
    console.log(`Deleted file: ${filePath}`);
  } catch (err) {
    console.error(`Failed to delete file: ${filePath}`, err);
  }
};

/**
 * Cleans up media files not in the latest 50 messages for each conversation.
 */
export const cleanupOldMedia = async () => {
  console.log("Starting cleanup of old media files.");

  try {
    // Fetch all conversations
    const conversations = await prisma.conversation.findMany({
      select: { id: true },
    });

    for (const convo of conversations) {
      const conversationId = convo.id;

      // Fetch the latest 50 messages for the conversation
      const latestMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { timestamp: "desc" },
        take: 50,
        select: { mediaUrl: true },
      });

      const latestMediaUrls = latestMessages
        .filter((msg) => msg.mediaUrl)
        .map((msg) => msg.mediaUrl);

      // Fetch all messages with media in the conversation
      const allMediaMessages = await prisma.message.findMany({
        where: {
          conversationId,
          mediaUrl: { not: null },
        },
        select: { mediaUrl: true },
      });

      const allMediaUrls = allMediaMessages.map((msg) => msg.mediaUrl);

      // Identify media URLs to delete (not in the latest 50)
      const mediaUrlsToDelete = allMediaUrls.filter(
        (url) => !latestMediaUrls.includes(url)
      );

      // Delete each identified media file
      for (const mediaUrl of mediaUrlsToDelete) {
        const fileName = path.basename(mediaUrl);
        const filePath = path.join(
          __dirname,
          "..",
          "uploads",
          "messages",
          fileName
        );

        // Check if file exists before attempting deletion
        if (fs.existsSync(filePath)) {
          await deleteFile(filePath);
        } else {
          console.warn(`File not found: ${filePath}`);
        }
      }
    }

    console.log("Cleanup of old media files completed.");
  } catch (error) {
    console.error("Error during cleanup process:", error);
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Schedules the cleanup task to run daily at 2 AM.
 */
export const scheduleCleanup = () => {
  // Schedule the task to run daily at 2 AM server time
  cron.schedule("0 2 * * *", () => {
    cleanupOldMedia();
  });

  console.log("Scheduled cleanup task to run daily at 2 AM.");
};
