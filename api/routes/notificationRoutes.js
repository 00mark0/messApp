import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getNotifications,
  markNotificationAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.post("/mark-as-read", authMiddleware, markNotificationAsRead);

export default router;
