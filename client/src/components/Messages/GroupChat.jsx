// GroupChat.jsx
import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom"; // Import useParams
import socket from "../../api/socket";
import AuthContext from "../../context/AuthContext";
import axios from "../../api/axios";

function GroupChat() {
  const { user, token } = useContext(AuthContext);
  const { conversationId } = useParams(); // Extract conversationId from URL
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // State to hold messages
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await axios.get(
          `/groups/${conversationId}/participants`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log(response.data.participants);
        setParticipants(response.data.participants);
      } catch (err) {
        console.error("Failed to fetch participants:", err);
      }
    };

    fetchParticipants(); // Initial fetch

    const intervalId = setInterval(fetchParticipants, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(intervalId); // Clear
    };
  }, [conversationId, token]);

  return <div>group chat</div>;
}

export default GroupChat;
