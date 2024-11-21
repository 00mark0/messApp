import { PrismaClient } from "@prisma/client";
import { validationResult } from "express-validator";
import { io } from "../server.js";

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

    // Emit the new message to other participants via socket.io
    io.to(groupId.toString()).emit("newMessage", message);

    // Fetch sender's username
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { username: true },
    });

    const senderUsername = sender ? sender.username : "Unknown";

    // Fetch group's name
    const group = await prisma.conversation.findUnique({
      where: { id: parseInt(groupId, 10) },
      select: { name: true },
    });

    const groupName = group ? group.name : "Unnamed Group";

    // Get all participants excluding the sender
    const participantsRes = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: parseInt(groupId, 10),
        userId: { not: senderId },
      },
    });

    // Prepare notifications data
    const notificationsData = participantsRes.map((participant) => ({
      userId: participant.userId,
      content: `${senderUsername} sent a new message in group "${groupName}"`,
      createdAt: new Date(),
    }));

    // Insert notifications individually to get their IDs
    const createdNotifications = await Promise.all(
      notificationsData.map((data) =>
        prisma.notification.create({
          data,
        })
      )
    );

    // Emit 'groupMessageNotification' to each participant with the notification ID
    createdNotifications.forEach((notification) => {
      io.to(notification.userId.toString()).emit(
        "groupMessageNotification",
        notification
      );
    });

    res.status(201).json({ message: "Message sent successfully." });
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

// Get group conversations for the current user
export const getGroupConversations = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Fetch group conversations where the current user is a participant
    const groups = await prisma.conversation.findMany({
      where: {
        isGroup: true,
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
              select: {
                id: true,
                username: true,
                profilePicture: true,
                isAdmin: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            timestamp: "desc",
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // Format the data
    const formattedGroups = groups.map((group) => {
      const lastMessage = group.messages[0];
      const unseenMessages = group.messages.filter(
        (message) => !message.seenBy.includes(userId)
      ).length;

      return {
        id: group.id,
        name: group.name,
        participants: group.participants.map((participant) => ({
          id: participant.user.id,
          username: participant.user.username,
          profilePicture: participant.user.profilePicture,
          isAdmin: participant.isAdmin,
        })),
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              timestamp: lastMessage.timestamp,
              sender: lastMessage.sender.username,
              seenBy:
                lastMessage.seenBy.length > 0
                  ? `Seen by ${lastMessage.seenBy.length} users`
                  : "Not seen",
            }
          : null,
        unseenMessages,
      };
    });

    res.json({ groups: formattedGroups });
  } catch (error) {
    console.error("Error fetching group conversations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove group and the conversation as group admin
export const removeGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  try {
    // Check if the user is an admin of the group
    const isAdmin = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: parseInt(groupId),
        userId,
        isAdmin: true,
      },
    });

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "You are not an admin of this group" });
    }

    // Delete related records in ConversationParticipant table
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: parseInt(groupId) },
    });

    // Delete related messages in the Message table
    await prisma.message.deleteMany({
      where: { conversationId: parseInt(groupId) },
    });

    // Remove the group conversation
    await prisma.conversation.delete({
      where: { id: parseInt(groupId) },
    });

    res.status(200).json({ message: "Group removed successfully" });
  } catch (error) {
    console.error("Error in removeGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Leave a group as a participant (if admin give admin rights to the second added participant)
export const leaveGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  try {
    // Check if the user is an admin of the group
    const isAdmin = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: parseInt(groupId),
        userId,
        isAdmin: true,
      },
    });

    if (isAdmin) {
      // Get the second participant in the group
      const secondParticipant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: parseInt(groupId),
          userId: { not: userId },
        },
      });

      if (secondParticipant) {
        // Give admin rights to the second participant
        await prisma.conversationParticipant.update({
          where: {
            conversationId_userId: {
              conversationId: parseInt(groupId),
              userId: secondParticipant.userId,
            },
          },
          data: {
            isAdmin: true,
          },
        });
      }
    }

    // Remove the user from the group
    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId: parseInt(groupId),
          userId,
        },
      },
    });

    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    console.error("Error in leaveGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Give admin rights to a participant in the group
export const giveAdminRights = async (req, res) => {
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

    // Give admin rights to the participant
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: parseInt(groupId),
          userId: parseInt(userId),
        },
      },
      data: {
        isAdmin: true,
      },
    });

    res.status(200).json({ message: "Admin rights given successfully" });
  } catch (error) {
    console.error("Error in giveAdminRights:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Fetch participants in a group
export const getGroupParticipants = async (req, res) => {
  const { groupId } = req.params;

  try {
    // Fetch participants in the group
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: parseInt(groupId),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
            email: true,
            isVisible: true,
            isOnline: true,
          },
        },
      },
    });

    res.json({ participants });
  } catch (error) {
    console.error("Error in getGroupParticipants:", error);
    res.status(500).json({ message: "Server error" });
  }
};
