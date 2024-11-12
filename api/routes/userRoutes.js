import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/auth.js";
import {
  updateProfile,
  requestPasswordReset,
  resetPassword,
  uploadProfilePicture,
  deleteAccount,
  searchUsers,
  getUserById,
} from "../controllers/userController.js";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        profilePicture: true,
      },
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile" });
    console.error(error);
  }
});

router.put("/profile", authMiddleware, updateProfile);
router.post("/request-password-reset", authMiddleware, requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/upload-profile-picture", authMiddleware, uploadProfilePicture);
router.delete("/delete-account", authMiddleware, deleteAccount);
router.get("/search", authMiddleware, searchUsers);
router.get("/:id", authMiddleware, getUserById);

export default router;
