import prisma from "../utils/prismaClient.js";
import { validationResult } from "express-validator";
import { io } from "../server.js";
import multer from "multer";
import path from "path";
import sendPushNotification from "../utils/sendPushNotification.js";

const messageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/messages/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

export const messageUpload = multer({
  storage: messageStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF, and MP4 are allowed."
        )
      );
    }
  },
});

export const sendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const recipientId = parseInt(req.params.recipientId, 10);
  let { content, replyToMessageId } = req.body;
  const senderId = req.user.userId;

  if (replyToMessageId) {
    replyToMessageId = parseInt(replyToMessageId, 10);
    if (isNaN(replyToMessageId)) {
      return res.status(400).json({ message: "Invalid replyToMessageId." });
    }
  }

  if (!content && !req.file) {
    return res
      .status(400)
      .json({ message: "Message content or media is required." });
  }

  try {
    // Fetch sender's contacts and recipient info in parallel
    const [senderWithContacts, recipient] = await Promise.all([
      prisma.user.findUnique({
        where: { id: senderId },
        select: {
          contacts: {
            where: { contactUserId: recipientId },
            select: { id: true },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: recipientId },
        select: {
          id: true,
          username: true,
          fcmToken: true,
        },
      }),
    ]);

    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found." });
    }

    if (!senderWithContacts?.contacts?.length) {
      return res.status(403).json({
        message: "Recipient is not in your contacts. Please add them first.",
      });
    }

    // First, fetch the existing conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: {
          every: {
            userId: { in: [senderId, recipientId] },
          },
        },
      },
      include: { participants: true },
    });

    // Then create a new conversation only if one doesn't exist
    const conversation = !existingConversation
      ? await prisma.conversation.create({
          data: {
            isGroup: false,
            participants: {
              create: [{ userId: senderId }, { userId: recipientId }],
            },
          },
          include: { participants: true },
        })
      : null;

    const finalConversation = existingConversation || conversation;

    // Prepare message data
    const messageData = {
      senderId,
      content,
      recipientId,
      conversationId: finalConversation.id,
      ...(replyToMessageId && { replyToMessageId }),
      ...(req.file && { mediaUrl: `/uploads/messages/${req.file.filename}` }),
    };

    // Create message and update conversation participants in parallel
    const [message] = await Promise.all([
      prisma.message.create({
        data: messageData,
        include: {
          sender: {
            select: { id: true, username: true },
          },
          replyToMessage: {
            include: {
              sender: {
                select: { id: true, username: true },
              },
            },
          },
        },
      }),
      prisma.conversationParticipant.updateMany({
        where: {
          conversationId: finalConversation.id,
          userId: { in: [senderId, recipientId] },
        },
        data: { deletedAt: null },
      }),
    ]);

    // Handle notifications and socket events in parallel
    const messageContent = content || "Media file";
    await Promise.all(
      [
        prisma.notification.create({
          data: {
            userId: recipientId,
            content: `${message.sender.username} sent you a message: "${messageContent}"`,
          },
        }),
        new Promise((resolve) => {
          io.to(recipientId.toString()).emit("newMessage", message);
          io.to(senderId.toString()).emit("newMessage", message);
          if (!existingConversation) {
            io.to(senderId.toString()).emit(
              "newConversation",
              finalConversation
            );
            io.to(recipientId.toString()).emit(
              "newConversation",
              finalConversation
            );
          }
          resolve();
        }),
        recipient.fcmToken &&
          sendPushNotification(
            recipientId,
            message.sender.username,
            messageContent,
            {
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              conversationId: finalConversation.id.toString(),
              senderId: senderId.toString(),
              recipientId: recipientId.toString(),
            }
          ),
      ].filter(Boolean)
    );

    res.status(201).json({ message, conversationId: finalConversation.id });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getConversations = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Fetch conversations the user is part of
    const conversations = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        participants: {
          some: {
            userId: userId,
            deletedAt: null,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
        messages: {
          orderBy: {
            timestamp: "desc",
          },
          take: 1, // Get the last message as a preview
        },
      },
    });

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getConversationMessages = async (req, res) => {
  const userId = req.user.userId;
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query; // Default to page 1 and limit 50

  try {
    // Check if the user is a participant in the conversation (regardless of deletedAt)
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: parseInt(conversationId),
        userId: userId,
      },
    });

    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Reset deletedAt for this user (since they are accessing the conversation)
    if (isParticipant.deletedAt) {
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: parseInt(conversationId),
            userId: userId,
          },
        },
        data: {
          deletedAt: null,
        },
      });
    }

    // Calculate pagination values
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;

    // Fetch messages in the conversation with pagination
    const messages = await prisma.message.findMany({
      where: {
        conversationId: parseInt(conversationId),
      },
      include: {
        sender: {
          select: { id: true, username: true },
        },
      },
      orderBy: {
        timestamp: "desc", // Newest messages first
      },
      skip: skip,
      take: take,
    });

    res.json({ messages });
  } catch (error) {
    console.error("Error in getConversationMessages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getLatest50Messages = async (req, res) => {
  const userId = req.user.userId;
  const { conversationId } = req.params;

  try {
    // Check if the user is a participant in the conversation (regardless of deletedAt)
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: parseInt(conversationId),
        userId: userId,
      },
    });

    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Reset deletedAt for this user (since they are accessing the conversation)
    if (isParticipant.deletedAt) {
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: parseInt(conversationId),
            userId: userId,
          },
        },
        data: {
          deletedAt: null,
        },
      });
    }

    // Fetch the latest 50 messages in descending order
    const messages = await prisma.message.findMany({
      where: {
        conversationId: parseInt(conversationId),
      },
      include: {
        sender: {
          select: { id: true, username: true },
        },
        reactions: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
        replyToMessage: {
          include: {
            sender: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: {
        timestamp: "desc", // Newest messages first
      },
      take: 50,
    });

    // Reverse to send messages in ascending order
    const orderedMessages = messages.reverse();

    res.json({ messages: orderedMessages });
  } catch (error) {
    console.error("Error in getLatest50Messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Marks messages as seen in a conversation and notifies senders via Socket.IO.
 * @param {string} conversationId - The ID of the conversation.
 * @param {number} userId - The ID of the user who has seen the messages.
 * @returns {Promise<Array<number>>} - List of sender IDs to notify.
 */
export const markMessagesAsSeenLogic = async (conversationId, userId) => {
  try {
    // Update messages to include the userId in seenBy
    await prisma.message.updateMany({
      where: {
        conversationId: parseInt(conversationId, 10),
        senderId: {
          not: userId,
        },
        NOT: {
          seenBy: {
            has: userId,
          },
        },
      },
      data: {
        seenBy: {
          push: userId,
        },
      },
    });

    // Retrieve messages to find unique sender IDs
    const messages = await prisma.message.findMany({
      where: {
        conversationId: parseInt(conversationId, 10),
        senderId: {
          not: userId,
        },
      },
      select: {
        senderId: true,
      },
    });

    // Extract unique sender IDs
    const senderIds = [...new Set(messages.map((msg) => msg.senderId))];

    // Emit "messagesSeen" event to each sender
    senderIds.forEach((senderId) => {
      io.to(senderId.toString()).emit("messagesSeen", {
        conversationId: conversationId.toString(),
        seenBy: userId,
      });
    });

    return senderIds;
  } catch (error) {
    console.error("Error in markMessagesAsSeenLogic:", error);
    throw error;
  }
};

/**
 * Controller for marking messages as seen via HTTP request.
 */
export const markMessagesAsSeen = async (req, res) => {
  const userId = req.user.userId;
  const { conversationId } = req.params;

  try {
    await markMessagesAsSeenLogic(conversationId, userId);
    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteConversation = async (req, res) => {
  const userId = req.user.userId;
  const { conversationId } = req.params;

  try {
    // Set deletedAt to current timestamp for the user
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: parseInt(conversationId),
          userId: userId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Conversation deleted" });
  } catch (error) {
    console.error("Error in deleteConversation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add Reaction to a Message
export const addReaction = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user.userId;

  try {
    // Check if message exists
    const message = await prisma.message.findUnique({
      where: { id: parseInt(messageId) },
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Create or update the reaction
    const reaction = await prisma.messageReaction.upsert({
      where: {
        messageId_userId: {
          messageId: parseInt(messageId),
          userId,
        },
      },
      update: { emoji },
      create: {
        messageId: parseInt(messageId),
        userId,
        emoji,
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    // Emit real-time event via Socket.IO
    io.to(message.conversationId.toString()).emit("reactionAdded", reaction);

    // Create a notification for the message sender (if not the same user)
    if (message.senderId !== userId) {
      const notification = await prisma.notification.create({
        data: {
          userId: message.senderId,
          content: `${reaction.user.username} reacted to your message: "${reaction.emoji}"`,
        },
      });

      // Emit notification to the recipient
      io.to(message.senderId.toString()).emit("notification", notification);
    }

    res.status(200).json({ reaction });
  } catch (error) {
    console.error("Error in addReaction:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove Reaction from a Message
export const removeReaction = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;

  try {
    // Fetch the message to get the conversationId
    const message = await prisma.message.findUnique({
      where: { id: parseInt(messageId) },
      select: { conversationId: true },
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    const { conversationId } = message;

    // Delete the reaction
    const reaction = await prisma.messageReaction.delete({
      where: {
        messageId_userId: {
          messageId: parseInt(messageId),
          userId,
        },
      },
    });

    // Emit real-time event via Socket.IO to the conversation room
    io.to(conversationId.toString()).emit("reactionRemoved", {
      messageId: reaction.messageId,
      userId: reaction.userId,
    });

    res.status(200).json({ message: "Reaction removed." });
  } catch (error) {
    console.error("Error in removeReaction:", error);
    res.status(500).json({ message: "Server error." });
  }
};
