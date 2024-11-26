import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { generalRateLimiterMiddleware } from "./rateLimiter.js"; // Import middleware

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Auth Middleware with Rate Limiting
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Apply general rate limiting middleware
    await generalRateLimiterMiddleware(req, res, next); // Pass control to rate limiter
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      const decoded = jwt.decode(token);

      if (decoded && decoded.userId) {
        try {
          await prisma.user.update({
            where: { id: decoded.userId },
            data: { isOnline: false },
          });
        } catch (err) {
          console.error("Failed to update online status:", err);
          return res.status(500).json({ message: "Server error" });
        }
      }

      return res.status(401).json({ message: "Token expired" });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    } else {
      console.error("Unexpected error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
};

export default authMiddleware;
