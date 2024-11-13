import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { createServer } from "http";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import contactRequestRoutes from "./routes/contactRequestRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import groupRoutes from "./routes/groupRoutes.js"; // Import group routes
import { fileURLToPath } from "url";

dotenv.config();

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.json());
app.use(cors());

// Serve static files from the "uploads" directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rate limiting middleware with custom handler
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per windowMs
  handler: (req, res, next, options) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      message: "Too many requests, please try again later.",
    });
  },
});
app.use(limiter);

// Serve static files from the client
app.use(express.static(path.join(__dirname, "../client/dist")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/contact-requests", contactRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/groups", groupRoutes); // Add group routes

app.use(errorHandler);

// Handle all other routes with the client build
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// WebSocket connection
io.on("connection", (socket) => {
  console.log("New client connected");

  // Join the room for the user
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  } else {
    console.log("User ID not provided in query");
  }

  // Handle markAsSeen
  socket.on("markAsSeen", async (data) => {
    const { conversationId, userId } = data;

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

      // Notify the sender
      const messages = await prisma.message.findMany({
        where: {
          conversationId: parseInt(conversationId),
          senderId: {
            not: userId,
          },
        },
      });

      // Get unique sender IDs
      const senderIds = [...new Set(messages.map((msg) => msg.senderId))];

      senderIds.forEach((senderId) => {
        io.to(senderId.toString()).emit("messagesSeen", {
          conversationId,
          seenBy: userId,
        });
      });
    } catch (error) {
      console.error("Error in markAsSeen via Socket.IO:", error);
    }
  });

  socket.on("typing", (data) => {
    const { conversationId, userId } = data;
    socket
      .to(conversationId.toString())
      .emit("typing", { conversationId, userId });
  });

  socket.on("stopTyping", (data) => {
    const { conversationId, userId } = data;
    socket
      .to(conversationId.toString())
      .emit("stopTyping", { conversationId, userId });
  });

  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId.toString());
  });

  // Handle sending messages
  socket.on("sendMessage", async (data) => {
    const { conversationId, senderId, recipientId, content } = data;

    try {
      // Save message to database
      const message = await prisma.message.create({
        data: {
          senderId,
          recipientId,
          content,
          conversationId,
        },
        include: {
          sender: {
            select: { id: true, username: true },
          },
        },
      });

      // Reset deletedAt for conversation participants
      await prisma.conversationParticipant.updateMany({
        where: {
          conversationId: conversationId,
          userId: { in: [senderId, recipientId] },
        },
        data: {
          deletedAt: null,
        },
      });

      // Emit the message to both participants
      io.to(recipientId.toString()).emit("receiveMessage", message);
      io.to(senderId.toString()).emit("receiveMessage", message);
    } catch (error) {
      console.error("Error in sendMessage via Socket.IO:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { io };
