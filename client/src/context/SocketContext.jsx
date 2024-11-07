import React, { createContext, useEffect, useState } from "react";
import io from "socket.io-client";
import AuthContext from "./AuthContext";
import PropTypes from "prop-types";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = React.useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;

    const newSocket = io("http://localhost:3000", {
      query: { userId: user.id },
    });

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket");
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
  children: PropTypes.node,
};

export default SocketContext;
