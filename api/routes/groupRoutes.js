import express from "express";
import { body, param } from "express-validator";
import {
  createGroup,
  addParticipant,
  removeParticipant,
  sendMessageToGroup,
  getGroupMessages,
} from "../controllers/groupController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Create a new group
router.post(
  "/create",
  authMiddleware,
  [
    body("name").notEmpty().withMessage("Group name is required"),
    body("participants").isArray().withMessage("Participants must be an array"),
  ],
  createGroup
);

// Add a participant to a group
router.post(
  "/:groupId/add",
  authMiddleware,
  [
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    body("userId").isInt().withMessage("User ID must be an integer"),
  ],
  addParticipant
);

// Remove a participant from a group
router.post(
  "/:groupId/remove",
  authMiddleware,
  [
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    body("userId").isInt().withMessage("User ID must be an integer"),
  ],
  removeParticipant
);

// Send a message to a group
router.post(
  "/:groupId/message",
  authMiddleware,
  [
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    body("content").notEmpty().withMessage("Content is required"),
  ],
  sendMessageToGroup
);

// Get messages in a group
router.get(
  "/:groupId/messages",
  authMiddleware,
  [param("groupId").isInt().withMessage("Group ID must be an integer")],
  getGroupMessages
);

export default router;
