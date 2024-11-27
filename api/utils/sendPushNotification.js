// utils/sendPushNotification.js
import admin from '../firebase.js';
import prisma from './prismaClient.js'; // Adjust the path as needed

const sendPushNotification = async (recipientId, title, body, data = {}) => {
  try {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { fcmToken: true },
    });

    if (recipient && recipient.fcmToken) {
      const payload = {
        notification: {
          title,
          body,
        },
        data,
        token: recipient.fcmToken,
      };

      const response = await admin.messaging().send(payload);
      console.log('Successfully sent push notification:', response);
    } else {
      console.log('No FCM token available for user:', recipientId);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    if (
      error.errorInfo &&
      error.errorInfo.code === 'messaging/registration-token-not-registered'
    ) {
      // Remove invalid token from the database
      try {
        await prisma.user.update({
          where: { id: recipientId },
          data: { fcmToken: null },
        });
        console.log(`Removed invalid FCM token for user ID: ${recipientId}`);
      } catch (dbError) {
        console.error('Error removing invalid FCM token from database:', dbError);
      }
    }
  }
};

export default sendPushNotification;