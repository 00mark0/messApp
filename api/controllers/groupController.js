import { PrismaClient } from "@prisma/client";
import { validationResult } from "express-validator";

const prisma = new PrismaClient();

export const createGroup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, participants } = req.body;
  const userId = req.user.userId;

  try {
    // Create the group conversation
    const conversation = await prisma.conversation.create({
      data: {
        name,
        isGroup: true,
        participants: {
          createMany: {
            data: [
              { userId, isAdmin: true },
              ...participants.map((participantId) => ({
                userId: participantId,
                isAdmin: false,
              })),
            ],
          },
        },
      },
    });

    res
      .status(201)
      .json({ message: "Group created successfully", conversation });
  } catch (error) {
    console.error("Error in createGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const addParticipant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { groupId } = req.params;
  const { userId } = req.body;
  const currentUserId = req.user.userId;

  try {
    // Check if the current user is an admin of the group
    const isAdmin = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: parseInt(groupId),
        userId: currentUserId,
        isAdmin: true,
      },
    });

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "You are not an admin of this group" });
    }

    // Add the participant to the group
    await prisma.conversationParticipant.create({
      data: {
        conversationId: parseInt(groupId),
        userId: parseInt(userId),
        isAdmin: false,
      },
    });

    res.status(200).json({ message: "Participant added successfully" });
  } catch (error) {
    console.error("Error in addParticipant:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeParticipant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { groupId } = req.params;
  const { userId } = req.body;
  const currentUserId = req.user.userId;

  try {
    // Check if the current user is an admin of the group
    const isAdmin = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: parseInt(groupId),
        userId: currentUserId,
        isAdmin: true,
      },
    });

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "You are not an admin of this group" });
    }

    // Remove the participant from the group
    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId: parseInt(groupId),
          userId: parseInt(userId),
        },
      },
    });

    res.status(200).json({ message: "Participant removed successfully" });
  } catch (error) {
    console.error("Error in removeParticipant:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const sendMessageToGroup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { groupId } = req.params;
  const { content } = req.body;
  const senderId = req.user.userId;

  try {
    // Check if the sender is a participant of the group
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: parseInt(groupId),
        userId: senderId,
      },
    });

    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "You are not a participant of this group" });
    }

    // Create the message in the group
    const message = await prisma.message.create({
      data: {
        senderId,
        content,
        conversationId: parseInt(groupId),
      },
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error("Error in sendMessageToGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  try {
    // Check if the user is a participant of the group
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: parseInt(groupId),
        userId,
      },
    });

    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "You are not a participant of this group" });
    }

    // Fetch messages in the group
    const messages = await prisma.message.findMany({
      where: {
        conversationId: parseInt(groupId),
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
    console.error("Error in getGroupMessages:", error);
    res.status(500).json({ message: "Server error" });
  }
};
