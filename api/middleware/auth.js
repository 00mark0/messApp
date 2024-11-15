// api/middleware/auth.js

import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      // Update isOnline status
      const decoded = jwt.decode(token);

      if (decoded && decoded.userId) {
        const updateOnlineStatus = async () => {
          await prisma.user.update({
            where: { id: decoded.userId },
            data: { isOnline: false },
          });
        };

        updateOnlineStatus()
          .then(() => res.status(401).json({ message: "Token expired" }))
          .catch((err) => {
            console.error("Failed to update online status:", err);
            res.status(500).json({ message: "Server error" });
          });

        return;
      }
    } else {
      res.status(401).json({ message: "Invalid token" });
    }
  }
};

export default authMiddleware;
