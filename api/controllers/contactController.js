// api/controllers/contactController.js

import { PrismaClient } from "@prisma/client";
import { validationResult } from "express-validator";

const prisma = new PrismaClient();

export const addContact = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.userId;
  const contactUserId = parseInt(req.params.contactUserId, 10);

  // Prevent adding oneself as a contact
  if (userId === contactUserId) {
    return res
      .status(400)
      .json({ message: "You cannot add yourself as a contact" });
  }

  try {
    // Check if the contact user exists
    const contactUser = await prisma.user.findUnique({
      where: { id: contactUserId },
    });

    if (!contactUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the contact already exists
    const existingContact = await prisma.contact.findFirst({
      where: {
        userId,
        contactUserId,
      },
    });

    if (existingContact) {
      return res.status(400).json({ message: "Contact already exists" });
    }

    // Create the new contact
    const contact = await prisma.contact.create({
      data: {
        userId,
        contactUserId,
      },
    });

    res.status(201).json({ message: "Contact added successfully", contact });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

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
    // Check if the contact exists
    const existingContact = await prisma.contact.findFirst({
      where: {
        userId,
        contactUserId: parseInt(contactUserId),
      },
    });

    if (!existingContact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    // Delete the contact
    await prisma.contact.delete({
      where: {
        id: existingContact.id,
      },
    });

    res.json({ message: "Contact removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
