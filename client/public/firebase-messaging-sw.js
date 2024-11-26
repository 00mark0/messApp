// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAgCNNzX2K4uEL21XURmStcFDYMzwv4zYE",
  authDomain: "messapp-5855e.firebaseapp.com",
  projectId: "messapp-5855e",
  storageBucket: "messapp-5855e.appspot.com",
  messagingSenderId: "265928522401",
  appId: "1:265928522401:web:28c0186971d89483c58ee0",
  measurementId: "G-ZRVVPSFS1S"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});