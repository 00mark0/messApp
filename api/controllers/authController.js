// api/controllers/authController.js

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { validationResult } from "express-validator";
import logger from "../utils/logger.js";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

export const register = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error("Validation errors: %o", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, isAdmin } = req.body;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn("User already exists: %s", email);
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isAdmin: isAdmin || false,
      },
    });

    logger.info("User registered successfully: %s", user.email);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    logger.error("Server error: %o", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error("Validation errors: %o", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, username, password } = req.body;

  try {
    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { username: username || undefined },
        ],
      },
    });

    if (!user) {
      logger.warn("Invalid credentials: user not found");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn("Invalid credentials: password mismatch");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    logger.info("User logged in successfully: %s", user.email);
    res.json({ token });
  } catch (error) {
    logger.error("Server error: %o", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const adminLogin = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error("Validation errors: %o", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, username, password } = req.body;

  try {
    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { username: username || undefined },
        ],
      },
    });

    if (!user || !user.isAdmin) {
      logger.warn("Invalid credentials: user not found or not an admin");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn("Invalid credentials: password mismatch");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    logger.info("Admin logged in successfully: %s", user.email);
    res.json({ token });
  } catch (error) {
    logger.error("Server error: %o", error);
    res.status(500).json({ message: "Server error" });
  }
};
