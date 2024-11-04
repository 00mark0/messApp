import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  updateProfile,
  requestPasswordReset,
  resetPassword,
  uploadProfilePicture,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/profile", authMiddleware, async (req, res) => {
  res.json({ message: "User profile", userId: req.user.userId });
});

router.put("/profile", authMiddleware, updateProfile);
router.post("/request-password-reset", authMiddleware, requestPasswordReset); // Ensure authMiddleware is applied here
router.post("/reset-password", resetPassword);
router.post("/upload-profile-picture", authMiddleware, uploadProfilePicture);

export default router;
