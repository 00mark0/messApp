import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import rateLimit from "express-rate-limit";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import contactRequestRoutes from "./routes/contactRequestRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import groupRoutes from "./routes/groupRoutes.js"; // Import group routes

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
);

// Serve static files from the "uploads" directory
app.use("/uploads", express.static("uploads"));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Serve static files from the client
const __dirname = path.resolve();
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
