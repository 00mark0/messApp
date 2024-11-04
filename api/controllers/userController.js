import { PrismaClient } from "@prisma/client";
import { validationResult, body } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage });

export const updateProfile = [
  // Validate and sanitize inputs
  body("username").optional().trim().isLength({ min: 3 }).escape(),
  body("email").optional().isEmail().normalizeEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { username, email } = req.body;

    try {
      // Check if username or email is already taken
      if (username) {
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });
        if (existingUser) {
          return res.status(400).json({ message: "Username is already taken" });
        }
      }

      if (email) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          return res.status(400).json({ message: "Email is already taken" });
        }
      }

      // Update user profile
      const user = await prisma.user.update({
        where: { id: userId },
        data: { username, email },
      });

      res.json({ message: "Profile updated successfully", user });
    } catch (error) {
      console.error("Error in updateProfile:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
];

export const requestPasswordReset = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: EMAIL_USER,
      to: user.email,
      subject: "Password Reset",
      text: `Click the link to reset your password: ${resetLink}`,
    });

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error in requestPasswordReset:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = [
  body("password").isLength({ min: 6 }).escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword },
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error in resetPassword:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
];

export const uploadProfilePicture = [
  upload.single("profilePicture"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.userId;
    const profilePicture = `/uploads/${req.file.filename}`;

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { profilePicture },
      });

      res.json({ message: "Profile picture updated successfully", user });
    } catch (error) {
      console.error("Error in uploadProfilePicture:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
];
