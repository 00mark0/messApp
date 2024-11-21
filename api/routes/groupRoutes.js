import express from "express";
import { body, param } from "express-validator";
import {
  createGroup,
  addParticipant,
  removeParticipant,
  sendMessageToGroup,
  getGroupMessages,
  getGroupConversations,
  removeGroup,
  leaveGroup,
  giveAdminRights,
  getGroupParticipants,
  getLatest20GroupMessages,
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
  getLatest20GroupMessages
);

// Get conversations for a user
router.get("/conversations", authMiddleware, getGroupConversations);

// Remove a group as group admin
router.delete(
  "/:groupId",
  authMiddleware,
  [param("groupId").isInt().withMessage("Group ID must be an integer")],
  removeGroup
);

// Leave a group
router.delete(
  "/:groupId/leave",
  authMiddleware,
  [param("groupId").isInt().withMessage("Group ID must be an integer")],
  leaveGroup
);

// Give admin rights to a group participant
router.post(
  "/:groupId/admin",
  authMiddleware,
  [
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    body("userId").isInt().withMessage("User ID must be an integer"),
  ],
  giveAdminRights
);

// Get participants in a group
router.get(
  "/:groupId/participants",
  authMiddleware,
  [param("groupId").isInt().withMessage("Group ID must be an integer")],
  getGroupParticipants
);

export default router;
