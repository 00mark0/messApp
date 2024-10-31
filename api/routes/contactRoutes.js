// api/routes/contactRoutes.js

import express from "express";
import { param } from "express-validator";
import {
  addContact,
  getContacts,
  removeContact,
} from "../controllers/contactController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Add a contact using contactUserId in the URL
router.post(
  "/add/:contactUserId",
  authMiddleware,
  [
    param("contactUserId")
      .isInt({ min: 1 })
      .withMessage("Contact user ID must be a positive integer"),
  ],
  addContact
);

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
