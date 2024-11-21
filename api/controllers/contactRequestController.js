// api/controllers/contactRequestController.js

import { PrismaClient } from "@prisma/client";
import { validationResult } from "express-validator";
import { io } from "../server.js";

const prisma = new PrismaClient();

export const sendContactRequest = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const senderId = req.user.userId;
  const receiverId = parseInt(req.params.receiverId, 10);

  try {
    // Prevent sending request to self
    if (senderId === receiverId) {
      return res
        .status(400)
        .json({ message: "You cannot send a contact request to yourself." });
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    // Check if a contact request already exists
    const existingRequest = await prisma.contactRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId,
        },
      },
    });
    if (existingRequest) {
      return res.status(400).json({ message: "Contact request already sent." });
    }

    // Check if they are already contacts
    const isContact = await prisma.contact.findFirst({
      where: {
        userId: senderId,
        contactUserId: receiverId,
      },
    });
    if (isContact) {
      return res
        .status(400)
        .json({ message: "User is already in your contacts." });
    }

    // Fetch sender's username
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { username: true },
    });

    // Create contact request
    const contactRequest = await prisma.contactRequest.create({
      data: {
        senderId,
        receiverId,
      },
    });

    // Create a notification for the receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        content: `${sender.username} has sent you a contact request.`,
      },
    });

    // Emit the contact-request event to the receiver's room
    io.to(receiverId.toString()).emit("contact-request", {
      id: senderId,
      username: sender.username,
    });

    res.status(201).json({ message: "Contact request sent.", contactRequest });
  } catch (error) {
    console.error("Error in sendContactRequest:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const respondToContactRequest = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.userId;
  const requestId = parseInt(req.params.requestId, 10);
  const { action } = req.body;

  try {
    // Fetch the contact request
    const contactRequest = await prisma.contactRequest.findUnique({
      where: { id: requestId },
    });

    if (!contactRequest) {
      return res.status(404).json({ message: "Contact request not found." });
    }

    // Ensure the current user is the receiver
    if (contactRequest.receiverId !== userId) {
      return res.status(403).json({
        message: "You are not authorized to respond to this request.",
      });
    }

    if (contactRequest.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Contact request has already been responded to." });
    }

    if (action === "accept") {
      // Update the contact request status
      await prisma.contactRequest.update({
        where: { id: requestId },
        data: { status: "accepted" },
      });

      // Fetch sender's info
      const senderInfo = await prisma.user.findUnique({
        where: { id: contactRequest.senderId },
        select: { id: true, username: true, email: true, profilePicture: true },
      });

      // Add each other as contacts
      await prisma.contact.createMany({
        data: [
          { userId: userId, contactUserId: contactRequest.senderId },
          { userId: contactRequest.senderId, contactUserId: userId },
        ],
      });

      // Emit the contact-accepted event to the sender's room
      io.to(contactRequest.senderId.toString()).emit("contact-accepted", {
        id: userId,
        username: req.user.username,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
      });

      // Emit the contact-accepted event to the receiver's room
      io.to(userId.toString()).emit("contact-accepted", senderInfo);

      console.log(
        `Emitted contact-accepted event for user ${contactRequest.senderId}`
      ); // Debugging log

      res.status(200).json({ message: "Contact request accepted." });
    } else if (action === "reject") {
      // Update the contact request status
      await prisma.contactRequest.update({
        where: { id: requestId },
        data: { status: "rejected" },
      });

      res.status(200).json({ message: "Contact request rejected." });
    }
  } catch (error) {
    console.error("Error in respondToContactRequest:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPendingContactRequests = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Fetch pending contact requests received by the user
    const contactRequests = await prisma.contactRequest.findMany({
      where: {
        receiverId: userId,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    res.status(200).json({ contactRequests });
  } catch (error) {
    console.error("Error in getPendingContactRequests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getSentContactRequests = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Fetch contact requests sent by the user
    const contactRequests = await prisma.contactRequest.findMany({
      where: {
        senderId: userId,
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    res.status(200).json({ contactRequests });
  } catch (error) {
    console.error("Error in getSentContactRequests:", error);
    res.status(500).json({ message: "Server error" });
  }
};
