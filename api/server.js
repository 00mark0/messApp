// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { createServer } from "http";
import { Server } from "socket.io";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import contactRequestRoutes from "./routes/contactRequestRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import groupRoutes from "./routes/groupRoutes.js"; // Import group routes
import { fileURLToPath } from "url";
import { markMessagesAsSeenLogic } from "./controllers/messageController.js"; // Import the logic

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
  const userId = socket.handshake.auth.userId;
  if (userId) {
    const userRoom = userId.toString(); // Ensure it's a string
    socket.join(userRoom);
    console.log(`User ${userId} joined room ${userRoom}`);
  } else {
    console.log("User ID not provided in query");
  }

  // Handle joinConversation
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId.toString());
    console.log(`Socket joined conversation room: ${conversationId}`);
  });

  // Handle leaveConversation
  socket.on("leaveConversation", (conversationId) => {
    socket.leave(conversationId.toString());
    console.log(`Socket left conversation room: ${conversationId}`);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { io };
