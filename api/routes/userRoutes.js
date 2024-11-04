import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  updateProfile,
  requestPasswordReset,
  resetPassword,
  uploadProfilePicture,
  deleteAccount,
  searchUsers,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/profile", authMiddleware, async (req, res) => {
  res.json({ message: "User profile", userId: req.user.userId });
});

router.put("/profile", authMiddleware, updateProfile);
router.post("/request-password-reset", authMiddleware, requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/upload-profile-picture", authMiddleware, uploadProfilePicture);
router.delete("/delete-account", authMiddleware, deleteAccount);
router.get("/search", authMiddleware, searchUsers);

export default router;
