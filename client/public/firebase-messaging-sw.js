// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAgCNNzX2K4uEL21XURmStcFDYMzwv4zYE",
  authDomain: "messapp-5855e.firebaseapp.com",
  projectId: "messapp-5855e",
  storageBucket: "messapp-5855e.firebasestorage.app",
  messagingSenderId: "265928522401",
  appId: "1:265928522401:web:28c0186971d89483c58ee0",
  measurementId: "G-ZRVVPSFS1S"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Access the data payload
  const notificationTitle = payload.data.title;
  const notificationBody = payload.data.body;
  const notificationOptions = {
    body: notificationBody,
    icon: '/messAppLogoRoundedSmall.PNG',
    // Add any additional options here
    data: {
      url: '/', // URL to open on click
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Add event listener for notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.');

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});