// api/routes/contactRoutes.js

import express from "express";
import { param } from "express-validator";
import {
  getContacts,
  removeContact,
} from "../controllers/contactController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Get the user's contacts
router.get("/", authMiddleware, getContacts);

// Remove a contact
router.delete(
  "/remove/:contactUserId",
  authMiddleware,
  [
    param("contactUserId")
      .isInt({ min: 1 })
      .withMessage("Contact user ID must be a positive integer"),
  ],
  removeContact
);

export default router;
