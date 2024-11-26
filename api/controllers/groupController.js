import { PrismaClient } from "@prisma/client";
import { validationResult } from "express-validator";
import { io } from "../server.js";
import multer from "multer";
import path from "path";

const prisma = new PrismaClient();

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

    // Emit 'groupCreated' event to all participants via socket.io
    participants.forEach((participantId) => {
      io.to(participantId.toString()).emit("groupCreated", conversation);
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

    // Fetch the added participant's details
    const addedParticipant = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { username: true },
    });

    // Emit 'participantAdded' event to all participants via socket.io
    io.to(groupId.toString()).emit("participantAdded", {
      groupId,
      username: addedParticipant.username,
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

    // Fetch the participant's details before removing them
    const removedParticipant = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { username: true },
    });

    // Remove the participant from the group
    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId: parseInt(groupId),
          userId: parseInt(userId),
        },
      },
    });

    // Emit 'participantRemoved' event to all participants via socket.io
    io.to(groupId.toString()).emit("participantRemoved", {
      groupId,
      username: removedParticipant.username,
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
  const { content, replyToMessageId } = req.body;
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
    const messageData = {
      senderId,
      content,
      conversationId: parseInt(groupId),
    };

    // Include content if provided
    if (content) {
      messageData.content = content;
    }

    // Include replyToMessageId if provided
    if (replyToMessageId) {
      messageData.replyToMessageId = parseInt(replyToMessageId);
    }

    if (req.file) {
      messageData.mediaUrl = `/uploads/messages/${req.file.filename}`;
    }

    // Create the message without includes
    const createdMessage = await prisma.message.create({
      data: messageData,
    });

    // Fetch the full message with all necessary relations
    const message = await prisma.message.findUnique({
      where: { id: createdMessage.id },
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
        reactions: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    // Emit the new message to other participants via socket.io
    console.log("Emitting newMessage to group:", message);
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
  const userId = req.user.userId;
  const { groupId } = req.params; // This is actually the conversationId for the group
  const { page = 1, limit = 50 } = req.query; // Default to page 1 and limit 50

  try {
    // Check if the user is a participant in the group
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: parseInt(groupId),
        userId: userId,
      },
    });

    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Calculate pagination values
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;

    // Fetch messages in the group with pagination
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
        timestamp: "desc", // Newest messages first
      },
      skip: skip,
      take: take,
    });

    res.json({ messages });
  } catch (error) {
    console.error("Error in getGroupMessages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getLatest50GroupMessages = async (req, res) => {
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

    // Fetch the latest 50 messages in the group in descending order
    const messages = await prisma.message.findMany({
      where: {
        conversationId: parseInt(groupId),
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
    console.error("Error in getLatest50GroupMessages:", error);
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

        // Fetch the second participant's details
        const secondParticipantDetails = await prisma.user.findUnique({
          where: { id: secondParticipant.userId },
          select: { username: true },
        });

        // Emit 'adminRightsGiven' event to all participants via socket.io
        io.to(groupId.toString()).emit("adminRightsGiven", {
          groupId,
          username: secondParticipantDetails.username,
        });
      }
    }

    // Fetch the user's details before they leave the group
    const leavingParticipant = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // Remove the user from the group
    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId: parseInt(groupId),
          userId,
        },
      },
    });

    // Emit 'participantLeft' event to the group via socket.io
    io.to(groupId.toString()).emit("participantLeft", {
      groupId,
      username: leavingParticipant.username,
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

    // Fetch the participant's details
    const participant = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { username: true },
    });

    // Emit 'adminRightsGiven' event to all participants via socket.io
    io.to(groupId.toString()).emit("adminRightsGiven", {
      groupId,
      username: participant.username,
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

// Add Reaction to a Group Message
export const addGroupReaction = async (req, res) => {
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
    io.to(message.conversationId.toString()).emit(
      "groupReactionAdded",
      reaction
    );

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

// Remove Reaction from a Group Message
export const removeGroupReaction = async (req, res) => {
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
    io.to(conversationId.toString()).emit("groupReactionRemoved", {
      messageId: reaction.messageId,
      userId: reaction.userId,
    });

    res.status(200).json({ message: "Reaction removed." });
  } catch (error) {
    console.error("Error in removeReaction:", error);
    res.status(500).json({ message: "Server error." });
  }
};
