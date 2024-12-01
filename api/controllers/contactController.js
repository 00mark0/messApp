// api/controllers/contactController.js
import prisma from "../utils/prismaClient.js";
import { validationResult, body, query } from "express-validator";

export const getContacts = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Retrieve the user's contacts
    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: {
        contact: {
          select: {
            id: true,
            username: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    // Map the contacts to return only the contact user details
    const contactList = contacts.map((contact) => contact.contact);

    res.json({ contacts: contactList });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const removeContact = async (req, res) => {
  const userId = req.user.userId;
  const contactUserId = parseInt(req.params.contactUserId, 10);

  try {
    // Check if the contact exists in both directions
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { userId, contactUserId },
          { userId: contactUserId, contactUserId: userId },
        ],
      },
    });

    if (contacts.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }

    // Delete the contact request if it exists
    await prisma.contactRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: contactUserId },
          { senderId: contactUserId, receiverId: userId },
        ],
      },
    });

    // Delete both contact entries
    await prisma.contact.deleteMany({
      where: {
        OR: [
          { userId, contactUserId },
          { userId: contactUserId, contactUserId: userId },
        ],
      },
    });

    res.json({ message: "Contact removed successfully" });
  } catch (error) {
    console.error("Error in removeContact:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const searchContacts = [
  query("q")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Search query must be between 2 and 50 characters")
    .escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        message: "Invalid search query",
      });
    }

    const { q } = req.query;
    const userId = req.user.userId;

    try {
      const contacts = await prisma.contact.findMany({
        where: {
          userId,
          contact: {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        },
        include: {
          contact: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        take: 10, // Limit results
      });

      const contactList = contacts.map((contact) => contact.contact);

      res.json({
        contacts: contactList,
        message: contactList.length === 0 ? "No contacts found" : null,
      });
    } catch (error) {
      console.error("Error in searchContacts:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
];
