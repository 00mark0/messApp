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

    // **Check if recipient is in sender's contact list**
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
        participants: {
          some: {
            userId: senderId,
          },
        },
      },
      include: {
        participants: true,
      },
    });

    // Filter conversations to find one with exactly two participants
    if (conversation) {
      const participantIds = conversation.participants.map((p) => p.userId);
      if (
        !participantIds.includes(recipientId) ||
        participantIds.length !== 2
      ) {
        conversation = null;
      }
    }

    if (!conversation) {
      // Create a new conversation between sender and recipient
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            createMany: {
              data: [{ userId: senderId }, { userId: recipientId }],
            },
          },
        },
      });
    }

    // Create message associated with the conversation
    const message = await prisma.message.create({
      data: {
        senderId,
        recipientId,
        content,
        conversationId: conversation.id,
      },
    });

    res.status(201).json({ message });
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
    // Check if user is part of the conversation
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: parseInt(conversationId),
        userId: userId,
      },
    });

    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied" });
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
    res.status(500).json({ message: "Server error" });
  }
};

export const getDirectMessages = async (req, res) => {
  const userId = req.user.userId;
  const { otherUserId } = req.params;

  try {
    // Fetch direct messages between the two users without a conversation
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: userId,
            recipientId: parseInt(otherUserId),
          },
          {
            senderId: parseInt(otherUserId),
            recipientId: userId,
          },
        ],
        conversationId: null,
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
    res.status(500).json({ message: "Server error" });
  }
};
