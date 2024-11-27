// socket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import prisma from "./utils/prismaClient.js";
import { markMessagesAsSeenLogic } from "./controllers/messageController.js";

dotenv.config();


const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: ["https://messapp.netlify.app", "https://messapp.duckdns.org", "https://staging--messapp.netlify.app"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // JWT Verification Middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token required"));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.userId = decoded.userId; // Attach user info to socket
      next();
    });
  });

  // WebSocket connection
  io.on("connection", async (socket) => {
    console.log("New client connected");

    const userId = socket.userId; 
    console.log(socket.user);
    if (userId) {
      const userRoom = userId.toString();
      socket.join(userRoom);
      console.log(`User ${userId} joined room ${userRoom}`);
    } else {
      console.log("Invalid userId");
    }

       // Handle FCM token registration
    socket.on("register_fcm_token", async (fcmToken) => {
      if (!fcmToken) {
        console.log("Received empty FCM token from user:", userId);
        return;
      }
    
      console.log(`Registering FCM token for user ID: ${userId} - Token: ${fcmToken}`);
    
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { fcmToken },
        });
        console.log(`Registered FCM token for user ID: ${userId}`);
      } catch (error) {
        console.error(`Error registering FCM token for user ID: ${userId}`, error);
      }
    });

    // Handle joining a room
    socket.on("join", (userIdParam) => {
      if (userIdParam) {
        console.log(`User ${userIdParam} joined room ${userIdParam}`);
        socket.join(userIdParam.toString());
      } else {
        console.log("Invalid userId");
      }
    });

    // Handle joining a conversation
    socket.on("joinConversation", (conversationId) => {
      if (conversationId) {
        socket.join(conversationId.toString());
        console.log(`User ${userId} joined conversation room: ${conversationId}`);
      } else {
        console.log("Invalid conversationId");
      }
    });

    // Handle leaving a conversation
    socket.on("leaveConversation", (conversationId) => {
      if (conversationId) {
        socket.leave(conversationId.toString());
        console.log(`Socket left conversation room: ${conversationId}`);
      } else {
        console.log("Invalid conversationId");
      }
    });

    // Handle markAsSeen
    socket.on("markAsSeen", async (data) => {
      const { conversationId, userId } = data;

      try {
        await markMessagesAsSeenLogic(conversationId, parseInt(userId, 10));
      } catch (error) {
        console.error("Error in markAsSeen via Socket.IO:", error);
        // Optionally, emit an error event to the client
        socket.emit("error", { message: "Failed to mark messages as seen." });
      }
    });

    // Handle groupMarkAsSeen
    socket.on("groupMarkAsSeen", async (data) => {
      const { conversationId, messageId, userId } = data;

      try {
        // Mark the message as seen by the user
        await groupMarkMessagesAsSeenLogic(conversationId, messageId, userId);

        // Fetch the updated message with necessary relations
        const updatedMessage = await prisma.message.findUnique({
          where: { id: messageId },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
            replyToMessage: {
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
        });

        // Emit the updated message to all users in the group conversation
        io.to(conversationId.toString()).emit("groupMessageSeen", updatedMessage);
      } catch (error) {
        console.error("Error in groupMarkAsSeen via Socket.IO:", error);
        socket.emit("error", {
          message: "Failed to mark group message as seen.",
        });
      }
    });

    // groupMarkMessagesAsSeenLogic
    async function groupMarkMessagesAsSeenLogic(conversationId, messageId, userId) {
      // Fetch the message from the database
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          conversationId: parseInt(conversationId, 10),
        },
        select: {
          id: true,
          seenBy: true,
        },
      });

      if (message && !message.seenBy.includes(userId)) {
        // Add userId to the seenBy array
        await prisma.message.update({
          where: { id: messageId },
          data: {
            seenBy: {
              push: userId,
            },
          },
        });
      }
    }

    // Handle typing indicator
    socket.on("typing", (data) => {
      const { conversationId, userId } = data;
      socket.to(conversationId.toString()).emit("typing", { conversationId, userId });
    });

    socket.on("stopTyping", (data) => {
      const { conversationId, userId } = data;
      socket.to(conversationId.toString()).emit("stopTyping", { conversationId, userId });
    });

    // Handle newMessage
    socket.on("newMessage", (message) => {
      const { conversationId } = message;
      // Broadcast the new message to all participants in the conversation except the sender
      socket.to(conversationId.toString()).emit("newMessage", message);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  return io;
};

export default initializeSocket;