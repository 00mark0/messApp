import { PrismaClient } from "@prisma/client";
import { validationResult, body, query } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

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

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG and GIF are allowed."));
    }
  },
});

// Define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      // Check if username is already taken
      if (username) {
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username is already taken" });
        }
      }

      // Check if email is already taken
      if (email) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email is already taken" });
        }
      }

      // Update user profile
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(username && { username }),
          ...(email && { email }),
        },
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
      // Fetch the current user to get the existing profile picture
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { profilePicture: true },
      });

      // Log the current user's profile picture
      console.log(
        "Current user's profile picture:",
        currentUser.profilePicture
      );

      // Delete the previous profile picture if it exists
      if (currentUser && currentUser.profilePicture) {
        const previousProfilePicturePath = path.join(
          __dirname,
          "..",
          currentUser.profilePicture
        );
        console.log(
          "Previous profile picture path:",
          previousProfilePicturePath
        );
        if (fs.existsSync(previousProfilePicturePath)) {
          fs.unlinkSync(previousProfilePicturePath);
          console.log("Previous profile picture deleted.");
        } else {
          console.log("Previous profile picture does not exist.");
        }
      }

      // Update user profile with the new profile picture
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

export const deleteAccount = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Fetch the user's profile picture
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true },
    });

    // Delete the user's profile picture if it exists
    if (user && user.profilePicture) {
      const profilePicturePath = path.join(
        __dirname,
        "..",
        user.profilePicture
      );
      if (fs.existsSync(profilePicturePath)) {
        fs.unlinkSync(profilePicturePath);
      }
    }

    // Delete the user account
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error in deleteAccount:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const searchUsers = [
  query("q").trim().isLength({ min: 1 }).escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q } = req.query;

    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          username: true,
          email: true,
          profilePicture: true,
        },
      });

      res.json({ users });
    } catch (error) {
      console.error("Error in searchUsers:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
];
