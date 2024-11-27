import prisma from "../utils/prismaClient.js";
import { io } from "../server.js";


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
  const { notificationIds } = req.body;

  try {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    res.status(500).json({ message: "Server error" });
  }
};
