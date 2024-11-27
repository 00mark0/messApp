// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, deleteToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAgCNNzX2K4uEL21XURmStcFDYMzwv4zYE",
  authDomain: "messapp-5855e.firebaseapp.com",
  projectId: "messapp-5855e",
  storageBucket: "messapp-5855e.appspot.com",
  messagingSenderId: "265928522401",
  appId: "1:265928522401:web:28c0186971d89483c58ee0",
  measurementId: "G-ZRVVPSFS1S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, deleteToken, onMessage };