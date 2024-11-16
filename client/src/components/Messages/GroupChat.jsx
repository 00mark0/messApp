import { useState, useEffect, useContext, useRef, useCallback } from "react";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";
import ReactScrollableFeed from "react-scrollable-feed";
import { io } from "socket.io-client";

function GroupChat() {
  const { token, user } = useContext(AuthContext);

  return (
    <div>
      <h1>Group Chat</h1>
    </div>
  );
}

export default GroupChat;
