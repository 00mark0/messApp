import { PrismaClient } from "@prisma/client";
import { io } from "../server.js";

const prisma = new PrismaClient();

export const getNotifications = async (req, res) => {
  const userId = req.user.userId;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    // emit notification event
    io.to(userId).emit("notification", { count: unreadCount });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error in getNotifications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markNotificationAsRead = async (req, res) => {
  const userId = req.user.userId;
  const notificationId = parseInt(req.params.notificationId, 10);

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId, isRead: false },
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ message: "Notification not found." });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    res.status(500).json({ message: "Server error" });
  }
};
