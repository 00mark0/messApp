import express from "express";
import { body, param, query } from "express-validator";
import {
  sendMessage,
  getConversations,
  getConversationMessages,
  markMessagesAsSeen,
  deleteConversation,
  getLatest50Messages,
  addReaction,
  removeReaction,
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

// Get 50 messages in a conversation
router.get(
  "/conversations/:conversationId",
  authMiddleware,
  [
    param("conversationId")
      .isInt()
      .withMessage("Conversation ID must be an integer"),
  ],
  getLatest50Messages
);

// Mark messages as seen in a conversation
router.post(
  "/conversations/:conversationId/seen",
  authMiddleware,
  markMessagesAsSeen
);

// Delete a conversation
router.delete(
  "/conversations/:conversationId",
  authMiddleware,
  deleteConversation
);

// Get all messages in a conversation
router.get(
  "/conversations/:conversationId/all",
  authMiddleware,
  [
    param("conversationId")
      .isInt()
      .withMessage("Conversation ID must be an integer"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Limit must be a positive integer"),
  ],
  getConversationMessages
);

// Add Reaction
router.post(
  "/:messageId/reactions",
  authMiddleware,
  [
    param("messageId").isInt().withMessage("Message ID must be an integer"),
    body("emoji").isString().notEmpty().withMessage("Emoji is required"),
  ],
  addReaction
);

// Remove Reaction
router.delete(
  "/:messageId/reactions",
  authMiddleware,
  [param("messageId").isInt().withMessage("Message ID must be an integer")],
  removeReaction
);

export default router;
