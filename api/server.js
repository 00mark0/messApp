// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import prisma from "./utils/prismaClient.js";
import { fileURLToPath } from "url";
import { createServer } from "http";
import initializeSocket from "./socket.js"; // Import the initialization function
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import contactRequestRoutes from "./routes/contactRequestRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import { scheduleCleanup } from "./utils/cleanup.js";

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Middleware
app.use(express.json());

const allowedOrigins = ["https://messapp.netlify.app", "https://messapp.duckdns.org"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

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
app.use("/api/groups", groupRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Handle all other routes with the client build
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
  scheduleCleanup();
});

const shutdown = async () => {
  console.log("Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
};

// Handle termination signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { io };