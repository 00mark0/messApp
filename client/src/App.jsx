// App.jsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import PropTypes from "prop-types";
import { useContext, useEffect, lazy, Suspense, useCallback } from "react";
import { AuthContext } from "./context/AuthContext";
import socket from "./api/socket";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import Layout from "./components/Layout";
import { messaging, getToken, deleteToken } from "./firebaseConfig";

const Inbox = lazy(() => import("./pages/Inbox"));
const Profile = lazy(() => import("./pages/Profile"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Chat = lazy(() => import("./components/Messages/Chat"));
const GroupChat = lazy(() => import("./components/Messages/GroupChat"));

function App() {
  const { user, token } = useContext(AuthContext);

  // Initialize Socket Connections
  const initializeSocket = useCallback(() => {
    if (user && token && !socket.connected) {
      socket.auth = { token }; // Use JWT token for authentication
      socket.connect();

      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });

      // Handle authentication errors from the server
      socket.on("authentication_error", (msg) => {
        console.error("Authentication Error:", msg);
        // Optionally, handle token refresh or redirect to login
      });
    }
  }, [user, token]);

  // Initialize Firebase Messaging
  const initializeFirebase = useCallback(() => {
    if (user && token) {
      const requestPermissionAndGetToken = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            // Delete existing token to force a new one
            const existingToken = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_REACT_APP_VAPID_KEY,
            });
            if (existingToken) {
              await deleteToken(messaging);
            }

            // Get a new token
            const currentToken = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_REACT_APP_VAPID_KEY,
            });

            if (currentToken) {
              console.log("Current FCM token:", currentToken);
              // Register FCM token via Socket.IO
              socket.emit("register_fcm_token", currentToken);
            } else {
              console.log("No registration token available. Request permission to generate one.");
            }
          } else {
            console.log("Notification permission not granted.");
          }
        } catch (err) {
          console.log("An error occurred while retrieving token.", err);
        }
      };

      // Periodically check for token refresh
      const tokenRefreshInterval = setInterval(async () => {
        try {
          const refreshedToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_REACT_APP_VAPID_KEY,
          });
          if (refreshedToken) {
            console.log("Refreshed FCM token:", refreshedToken);
            // Register refreshed FCM token via Socket.IO
            socket.emit("register_fcm_token", refreshedToken);
          }
        } catch (err) {
          console.log("Error refreshing token.", err);
        }
      }, 60 * 60 * 1000); // Check every hour

      requestPermissionAndGetToken();

      return () => clearInterval(tokenRefreshInterval);
    }
  }, [user, token]);

  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }
  }, []);
  
  // Call Initialization Functions within useEffect
  useEffect(() => {
    initializeSocket();
    initializeFirebase();

    return () => {
      // Cleanup Socket Connections
      if (socket.connected) {
        socket.off("connect");
        socket.off("connect_error");
        socket.off("authentication_error"); // Added to cleanup
        socket.disconnect();
      }
    };
  }, [initializeSocket, initializeFirebase]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Inbox />} />
            <Route path="/chat/:conversationId/:recipientId" element={<Chat />} />
            <Route path="/group/:conversationId" element={<GroupChat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/contacts" element={<Contacts />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

function PrivateRoute() {
  const { token } = useContext(AuthContext);
  return token ? <Outlet /> : <Navigate to="/login" />;
}

App.propTypes = {
  children: PropTypes.node,
};

export default App;