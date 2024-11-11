// context/SocketContext.jsx

import React, { createContext, useEffect, useState } from "react";
import io from "socket.io-client";
import AuthContext from "./AuthContext";
import PropTypes from "prop-types";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = React.useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user || !user.id) return; // Ensure user and user.id are available

    console.log(`Initializing socket for user ${user.id}`);

    const newSocket = io("http://localhost:3000", {
      query: { userId: user.id },
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SocketContext;
