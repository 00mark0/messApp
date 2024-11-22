import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle } from "@fortawesome/free-solid-svg-icons";
import socket from "../../api/socket";
import InputEmoji from "react-input-emoji";

function Chat() {
  const { token, user, onlineStatusToggle } = useContext(AuthContext);
  const { conversationId, recipientId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [recipient, setRecipient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [distanceFromBottom, setDistanceFromBottom] = useState(0);
  const scrollableRef = useRef(null);

  // pixels from the bottom
  const SCROLL_THRESHOLD = 100;

  const isUserNearBottom = () => {
    if (!scrollableRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = scrollableRef.current;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  };

  const scrollToBottom = () => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, []);

  useEffect(() => {
    if (distanceFromBottom < SCROLL_THRESHOLD) {
      scrollToBottom();
    }
  }, [messages]);

  const handleScroll = () => {
    if (scrollableRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollableRef.current;
      const distance = scrollHeight - scrollTop - clientHeight;
      setDistanceFromBottom(distance);
    }
  };

  // scroll chat down on new message
  useEffect(() => {
    if (scrollableRef.current && isUserNearBottom()) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Recipient Data
      const userResponse = await axios.get(`/user/${recipientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipient(userResponse.data.user);

      // Fetch Messages if Existing Conversation
      if (conversationId !== "new") {
        const messagesResponse = await axios.get(
          `/messages/conversations/${conversationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(messagesResponse.data.messages || []);

        // Mark Messages as Seen
        await axios.post(
          `/messages/conversations/${conversationId}/seen`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error(
        "Error fetching data:",
        err.response ? err.response.data : err.message
      );
      setError("Failed to load chat data.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, recipientId, token]);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const response = await axios.get("/auth/online", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOnlineUsers(response.data.onlineUsers);
    } catch (error) {
      console.error("Failed to fetch online users:", error);
    }
  }, [token]);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up interval for fetching online users
  useEffect(() => {
    fetchOnlineUsers(); // Initial fetch

    const interval = setInterval(fetchOnlineUsers, 10000);

    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);

  const handleReceiveMessage = useCallback(
    (message) => {
      if (parseInt(message.conversationId) === parseInt(conversationId)) {
        setMessages((prevMessages) => {
          // Check if the message already exists
          if (!prevMessages.find((msg) => msg.id === message.id)) {
            return [...prevMessages, message];
          }
          return prevMessages;
        });
      }
    },
    [conversationId]
  );

  const handleMessagesSeen = useCallback(
    (data) => {
      const { conversationId: convId, seenBy } = data;
      if (parseInt(convId) === parseInt(conversationId)) {
        const seenByNumber = Number(seenBy); // Ensure it's a number
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (!msg.seenBy.includes(seenByNumber)) {
              return { ...msg, seenBy: [...msg.seenBy, seenByNumber] };
            }
            return msg;
          })
        );
      }
    },
    [conversationId]
  );

  const handleTyping = useCallback(
    (data) => {
      if (data.userId !== user.id) {
        setOtherUserTyping(true);
      }
    },
    [user.id]
  );

  const handleStopTyping = useCallback(
    (data) => {
      if (data.userId !== user.id) {
        setOtherUserTyping(false);
      }
    },
    [user.id]
  );

  useEffect(() => {
    // Join conversation room
    socket.emit("joinConversation", conversationId);

    // Listen for incoming messages
    socket.on("receiveMessage", handleReceiveMessage);

    // Listen for messages seen
    socket.on("messagesSeen", handleMessagesSeen);

    // Listen for typing events
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    // Cleanup on unmount or when dependencies change
    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      // Optionally leave the conversation room
      socket.emit("leaveConversation", conversationId);
    };
  }, [
    conversationId,
    handleReceiveMessage,
    handleMessagesSeen,
    handleTyping,
    handleStopTyping,
  ]);

  const markAsSeen = useCallback(() => {
    socket.emit("markAsSeen", {
      conversationId,
      userId: user.id,
    });
  }, [conversationId, user.id]);

  useEffect(() => {
    if (messages.length > 0 && distanceFromBottom < SCROLL_THRESHOLD) {
      const debounceMarkAsSeen = setTimeout(() => {
        console.log("Marking messages as seen...");
        markAsSeen();
      }, 500);

      return () => clearTimeout(debounceMarkAsSeen);
    }
  }, [markAsSeen, messages, distanceFromBottom]);

  const handleInputChange = useCallback(
    (value) => {
      setInput(value);

      if (value && !isTyping) {
        setIsTyping(true);
        socket.emit("typing", {
          conversationId,
          userId: user.id,
        });
      } else if (!value && isTyping) {
        setIsTyping(false);
        socket.emit("stopTyping", {
          conversationId,
          userId: user.id,
        });
      }
    },
    [conversationId, isTyping, user.id]
  );

  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      const response = await axios.post(
        `/messages/${recipientId}`,
        { content: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (conversationId === "new") {
        navigate(`/chat/${response.data.conversationId}/${recipientId}`);
      }

      setInput("");
      setIsTyping(false);
      socket.emit("stopTyping", {
        conversationId,
        userId: user.id,
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.error("Error sending message: User not in your contact list.");
        setError("User not in your contact list.");
      } else {
        console.error("Error sending message:", err.response || err.message);
        setError("Failed to send message.");
      }
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="w-full min-h-screen dark:bg-gray-800">
      <div className="container mx-auto p-4 flex flex-col h-screen dark:bg-gray-800">
        <button
          onClick={handleBack}
          className="
            bg-blue-500 text-white px-4 py-2 rounded mb-4
            hover:bg-blue-600 focus:outline-none w-32 
        "
        >
          Back
        </button>
        <h1 className="text-2xl font-bold mb-4 dark:text-white">
          Chat with {recipient ? recipient.username : "User"}
        </h1>

        {distanceFromBottom > SCROLL_THRESHOLD && (
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded mb-4 shadow-md w-32 mx-auto"
            onClick={() => console.log("Clicked View All")}
          >
            View All
          </button>
        )}

        <div
          ref={scrollableRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto mb-4"
        >
          {messages.length > 0 ? (
            messages.map((msg, index) => {
              const isCurrentUserSender = msg.senderId === user.id;
              const nextMessage = messages[index + 1];

              // Check if this is the last message sent by the current user
              const isLastMessageByUser =
                isCurrentUserSender &&
                (!nextMessage || nextMessage.senderId !== user.id);

              return (
                <div
                  key={msg.id}
                  className={`p-2 my-2 rounded ${
                    isCurrentUserSender
                      ? "bg-blue-200 ml-auto text-right"
                      : "bg-gray-200"
                  } max-w-md`}
                >
                  <div className="flex gap-2 items-start">
                    <div className="relative flex-shrink-0">
                      {!isCurrentUserSender && recipient && (
                        <img
                          src={`${import.meta.env.VITE_REACT_APP_API_URL}${
                            recipient.profilePicture || "/default-avatar.png"
                          }`}
                          alt="Recipient Profile"
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      {onlineStatusToggle &&
                        !isCurrentUserSender &&
                        recipient &&
                        onlineUsers.some(
                          (user) => user.id === recipient.id
                        ) && (
                          <span>
                            <FontAwesomeIcon
                              icon={faCircle}
                              className="text-green-500 text-xs absolute bottom-0 right-0"
                            />
                          </span>
                        )}
                    </div>
                    <div className="flex-1">
                      <p className="break-words">{msg.content}</p>
                      <p className="text-xs text-gray-600 text-end">
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                      {/* Show 'Seen' indicator if applicable */}
                      {isLastMessageByUser &&
                        isCurrentUserSender &&
                        recipient &&
                        msg.seenBy.includes(recipient.id) && (
                          <p className="text-xs text-green-500">Seen</p>
                        )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p
              className="
                  text-center text-gray-500 dark:text-gray-400
                  mt-4 
              "
            >
              No messages yet. Start the conversation!
            </p>
          )}
          {otherUserTyping && <p className="text-gray-500 italic">Typing...</p>}
        </div>

        <div className="flex">
          <InputEmoji
            value={input}
            onChange={handleInputChange}
            cleanOnEnter
            onEnter={sendMessage}
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 rounded-r disabled:bg-gray-400"
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
