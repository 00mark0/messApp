// App.jsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import PropTypes from "prop-types";
import { useContext, useEffect } from "react";
import { AuthContext } from "./context/AuthContext";
import socket from "./api/socket";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import Inbox from "./pages/Inbox";
import Profile from "./pages/Profile";
import Contacts from "./pages/Contacts";
import Chat from "./components/Messages/Chat";
import GroupChat from "./components/Messages/GroupChat"; // Import GroupChat
import Layout from "./components/Layout";

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
    }

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [user]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Inbox />} />
          <Route path="/chat/:conversationId/:recipientId" element={<Chat />} />
          <Route path="/group/:conversationId" element={<GroupChat />} />{" "}
          {/* New Route */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/contacts" element={<Contacts />} />
        </Route>
      </Route>
    </Routes>
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
