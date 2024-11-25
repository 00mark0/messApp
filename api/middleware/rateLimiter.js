// api/middleware/rateLimiter.js

import rateLimit from "express-rate-limit";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Configuration for the registration endpoint
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 registration requests per windowMs
  message: {
    message:
      "Too many registration attempts from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res /*next*/) => {
    res.status(429).json({
      message: "Too many registration attempts. Please try again later.",
    });
  },
});

// Configuration for the login endpoint
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login requests per windowMs
  message: {
    message:
      "Too many login attempts from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res /*next*/) => {
    res
      .status(429)
      .json({ message: "Too many login attempts. Please try again later." });
  },
});

// General Rate Limiting Configuration
export const generalRateLimiter = new RateLimiterMemory({
  points: 20, // Number of points
  duration: 1, // Per second
});

// Message Sending Rate Limiter
const messageRateLimiter = new RateLimiterMemory({
  points: 5, // 5 messages
  duration: 1, // per second
});

// Middleware for general rate limiting
export const generalRateLimiterMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.userId; // Ensure req.user is set by authMiddleware
    await generalRateLimiter.consume(userId);
    next();
  } catch (err) {
    if (err instanceof Error && err.msBeforeNext) {
      res.set("Retry-After", String(Math.round(err.msBeforeNext / 1000)));
    }
    res
      .status(429)
      .json({ message: "Too many requests. Please try again later." });
  }
};

// Middleware for message sending rate limiting
export const messageRateLimiterMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.userId; // Ensure req.user is set by authMiddleware
    await messageRateLimiter.consume(userId);
    next();
  } catch (err) {
    if (err instanceof Error && err.msBeforeNext) {
      res.set("Retry-After", String(Math.round(err.msBeforeNext / 1000)));
    }
    res
      .status(429)
      .json({ message: "Too many messages. Please try again later." });
  }
};
