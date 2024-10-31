import express from "express";
import { body, param } from "express-validator";
import {
  sendMessage,
  getConversations,
  getConversationMessages,
  getDirectMessages,
} from "../controllers/messageController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Send a message using recipientId in the URL
router.post(
  "/:recipientId",
  authMiddleware,
  [
    param("recipientId").isInt().withMessage("Recipient ID must be an integer"),
    body("content").notEmpty().withMessage("Content is required"),
  ],
  sendMessage
);

// Get all conversations for the user
router.get("/conversations", authMiddleware, getConversations);

// Get messages in a specific conversation
router.get(
  "/conversations/:conversationId",
  authMiddleware,
  [
    param("conversationId")
      .isInt()
      .withMessage("Conversation ID must be an integer"),
  ],
  getConversationMessages
);

// Get direct messages with another user
router.get(
  "/direct/:otherUserId",
  authMiddleware,
  [
    param("otherUserId")
      .isInt()
      .withMessage("Other User ID must be an integer"),
  ],
  getDirectMessages
);

export default router;
