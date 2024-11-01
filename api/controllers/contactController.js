// api/controllers/contactController.js

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
