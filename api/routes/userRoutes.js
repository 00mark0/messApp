// api/routes/userRoutes.js

import express from "express";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/profile", authMiddleware, async (req, res) => {
  // Access req.user from the token
  res.json({ message: "User profile", userId: req.user.userId });
});

export default router;
