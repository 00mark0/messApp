// api/routes/contactRequestRoutes.js

import express from "express";
import { param, body } from "express-validator";
import {
  sendContactRequest,
  respondToContactRequest,
  getPendingContactRequests,
  getSentContactRequests,
} from "../controllers/contactRequestController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Send a contact request
router.post(
  "/send/:receiverId",
  authMiddleware,
  [
    param("receiverId")
      .isInt({ min: 1 })
      .withMessage("Receiver ID must be a positive integer"),
  ],
  sendContactRequest
);

// Respond to a contact request (accept or reject)
router.post(
  "/respond/:requestId",
  authMiddleware,
  [
    param("requestId")
      .isInt({ min: 1 })
      .withMessage("Request ID must be a positive integer"),
    body("action")
      .isIn(["accept", "reject"])
      .withMessage("Action must be 'accept' or 'reject'"),
  ],
  respondToContactRequest
);

// Get pending received contact requests
router.get("/pending", authMiddleware, getPendingContactRequests);

// Get sent contact requests
router.get("/sent", authMiddleware, getSentContactRequests);

export default router;
