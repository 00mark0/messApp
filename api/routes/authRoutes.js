// api/routes/authRoutes.js

import express from "express";
import { body } from "express-validator";
import {
  register,
  login,
  logout,
  getOnlineUsers,
  updateOnlineVisibility,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/auth.js";
import { registerLimiter } from "../middleware/rateLimiter.js";
import { loginLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Registration route
router.post(
  "/register",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("isAdmin")
      .optional()
      .isBoolean()
      .withMessage("isAdmin must be a boolean"),
  ],
  registerLimiter,
  register
);

// Login route
router.post(
  "/login",
  [
    body("password").notEmpty().withMessage("Password is required"),
    body().custom((req) => {
      if (!req.email && !req.username) {
        throw new Error("Email or username is required");
      }
      return true;
    }),
  ],
  loginLimiter,
  login
);

// Logout route
router.post("/logout", authMiddleware, logout);

// Get online users route
router.get("/online", authMiddleware, getOnlineUsers);

// Update online visibility route
router.put("/online", authMiddleware, updateOnlineVisibility);

export default router;
