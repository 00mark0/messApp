import { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";
import { io } from "socket.io-client";
import debounce from "lodash.debounce";

function Chat() {
  const { token, user } = useContext(AuthContext);
  const { conversationId, recipientId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [recipient, setRecipient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const socket = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Recipient Data
        const userResponse = await axios.get(`/user/${recipientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecipient(userResponse.data.user);
        console.log(userResponse.data.user);

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
    };

    fetchData();
  }, [conversationId, recipientId, token]);

  const handleReceiveMessage = useCallback(
    (message) => {
      console.log("Received message:", message);
      if (parseInt(message.conversationId) === parseInt(conversationId)) {
        setMessages((prevMessages) => {
          // Check if the message already exists
          if (!prevMessages.find((msg) => msg.id === message.id)) {
            const updatedMessages = [...prevMessages, message];
            console.log("Updated messages array:", updatedMessages);
            return updatedMessages;
          }
          return prevMessages;
        });
      }
    },
    [conversationId]
  );

  useEffect(() => {
    // Connect to Socket.IO
    socket.current = io("http://localhost:3000", {
      query: { userId: user.id },
    });

    // Join conversation room
    socket.current.emit("joinConversation", conversationId);

    // Listen for incoming messages
    socket.current.on("receiveMessage", handleReceiveMessage);

    // Listen for messages seen
    const handleMessagesSeen = (data) => {
      const { conversationId: convId, seenBy } = data;
      if (parseInt(convId) === parseInt(conversationId)) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (!msg.seenBy.includes(seenBy)) {
              return { ...msg, seenBy: [...msg.seenBy, seenBy] };
            }
            return msg;
          })
        );
      }
    };

    socket.current.on("messagesSeen", handleMessagesSeen);

    // Listen for typing events
    const handleTyping = (data) => {
      if (data.userId !== user.id) {
        setOtherUserTyping(true);
      }
    };

    const handleStopTyping = (data) => {
      if (data.userId !== user.id) {
        setOtherUserTyping(false);
      }
    };

    socket.current.on("typing", handleTyping);
    socket.current.on("stopTyping", handleStopTyping);

    // Cleanup on unmount
    return () => {
      socket.current.off("receiveMessage", handleReceiveMessage);
      socket.current.off("messagesSeen", handleMessagesSeen);
      socket.current.off("typing", handleTyping);
      socket.current.off("stopTyping", handleStopTyping);
      socket.current.disconnect();
    };
  }, [conversationId, user.id, handleReceiveMessage]);

  useEffect(() => {
    if (socket.current && messages.length > 0) {
      socket.current.emit("markAsSeen", {
        conversationId,
        userId: user.id,
      });
    }
  }, [messages, conversationId, user.id]);

  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const emitTypingEvent = useCallback(
    debounce(() => {
      setIsTyping(false);
      socket.current.emit("stopTyping", {
        conversationId,
        userId: user.id,
      });
    }, 500),
    [conversationId, user.id]
  );

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      socket.current.emit("typing", {
        conversationId,
        userId: user.id,
      });
    }

    emitTypingEvent();
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      if (conversationId === "new") {
        // Start New Conversation via API
        const response = await axios.post(
          `/messages/${recipientId}`,
          { content: input },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        navigate(`/chat/${response.data.conversationId}/${recipientId}`);
      } else {
        // Send Message via Socket.IO
        const messageData = {
          conversationId: parseInt(conversationId),
          senderId: user.id,
          recipientId: parseInt(recipientId),
          content: input,
        };

        socket.current.emit("sendMessage", messageData);
        setInput("");
      }
    } catch (err) {
      console.error(
        "Error sending message:",
        err.response ? err.response.data : err.message
      );
      setError("Failed to send message.");
    }
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
          onClick={() => navigate("/")}
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

        <div
          className="flex-1 overflow-y-auto mb-4"
          ref={chatContainerRef}
          onScroll={handleScroll}
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
                  <p>{msg.content}</p>
                  <p className="text-xs text-gray-600">
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
          <div ref={messagesEndRef} />
        </div>

        <div className="flex">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={handleInputChange}
            className="border p-2 rounded-l w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
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
