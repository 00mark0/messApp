import { PrismaClient } from "@prisma/client";
import { validationResult } from "express-validator";

const prisma = new PrismaClient();

export const sendMessage = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const recipientId = parseInt(req.params.recipientId, 10);
  const { content } = req.body;
  const senderId = req.user.userId;

  try {
    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Check if recipient is in sender's contact list
    const isContact = await prisma.contact.findFirst({
      where: {
        userId: senderId,
        contactUserId: recipientId,
      },
    });

    if (!isContact) {
      return res.status(403).json({
        message:
          "Recipient is not in your contacts. Please add them as a contact first.",
      });
    }

    // Check if a conversation already exists between the two users
    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: {
                userId: senderId,
              },
            },
          },
          {
            participants: {
              some: {
                userId: recipientId,
              },
            },
          },
        ],
      },
      include: {
        participants: true,
      },
    });

    if (conversation) {
      // Ensure the conversation has exactly two participants
      const participantIds = conversation.participants.map((p) => p.userId);
      if (participantIds.length !== 2) {
        conversation = null;
      }
    }

    if (!conversation) {
      // Create a new conversation since it doesn't exist
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            create: [{ userId: senderId }, { userId: recipientId }],
          },
        },
      });
    }

    // Reset deletedAt for both participants
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: conversation.id,
        userId: { in: [senderId, recipientId] },
      },
      data: {
        deletedAt: null,
      },
    });

    // Create message associated with the conversation
    const message = await prisma.message.create({
      data: {
        senderId,
        recipientId,
        content,
        conversationId: conversation.id,
      },
    });

    // Fetch sender's username
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { username: true },
    });

    // Create a notification for the recipient
    await prisma.notification.create({
      data: {
        userId: recipientId,
        content: `${sender.username} sent you a message: "${content}"`,
      },
    });

    res.status(201).json({ message, conversationId: conversation.id });
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

    // Fetch messages in the conversation
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
        timestamp: "asc",
      },
    });

    res.json({ messages });
  } catch (error) {
    console.error("Error in getConversationMessages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markMessagesAsSeen = async (req, res) => {
  const userId = req.user.userId;
  const { conversationId } = req.params;

  try {
    await prisma.message.updateMany({
      where: {
        conversationId: parseInt(conversationId),
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
    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    console.error("Error in markMessagesAsSeen:", error);
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
