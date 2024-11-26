import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import PropTypes from "prop-types";
import { useContext, useEffect, lazy, Suspense } from "react";
import { AuthContext } from "./context/AuthContext";
import socket from "./api/socket";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import Layout from "./components/Layout";
import { messaging, getToken, onMessage } from "./firebaseConfig";
import axios from "./api/axios";

const Inbox = lazy(() => import("./pages/Inbox"));
const Profile = lazy(() => import("./pages/Profile"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Chat = lazy(() => import("./components/Messages/Chat"));
const GroupChat = lazy(() => import("./components/Messages/GroupChat"));

function App() {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.id) {
      socket.auth = { userId: user.id };
      socket.connect();

      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
      });

      // Request permission and get FCM token
      const requestPermissionAndGetToken = async () => {
        try {
          const currentToken = await getToken(messaging, { vapidKey: 'BPcq3Bt1hlbscHoW7yxmhSh45EwslZ76a_eK5k7lX2TeGcYto_E6dYgkkiZ1n7QepDfUxLw5urHAKUwYWkWoRlc' });
          if (currentToken) {
            console.log('Current token:', currentToken);
            // Send the token to your server
            await axios.post('/api/user/fcmToken', { fcmToken: currentToken });
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } catch (err) {
          console.log('An error occurred while retrieving token.', err);
        }
      };

      requestPermissionAndGetToken();

      // Handle incoming messages
      onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // Customize how you handle the incoming message
        alert(`New message: ${payload.notification.title} - ${payload.notification.body}`);
      });
    }

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [user]);

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