import express from "express";
import { body, param, query, check } from "express-validator";
import {
  sendMessage,
  getConversations,
  getConversationMessages,
  markMessagesAsSeen,
  deleteConversation,
  getLatest50Messages,
  addReaction,
  removeReaction,
  messageUpload,
} from "../controllers/messageController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Send a message using recipientId in the URL
router.post(
  "/:recipientId",
  authMiddleware,
  messageUpload.single("media"), // Move Multer middleware before validators
  [
    // Validate recipientId
    param("recipientId").isInt().withMessage("Recipient ID must be an integer"),
    // Custom validation for content and media
    body().custom((_, { req }) => {
      if (!req.body.content && !req.file) {
        throw new Error("Message content or media is required.");
      }
      return true;
    }),
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
