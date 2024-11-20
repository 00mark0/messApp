// GroupChat.jsx
import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import useParams
import socket from "../../api/socket";
import AuthContext from "../../context/AuthContext";
import axios from "../../api/axios";
import ReactScrollableFeed from "react-scrollable-feed";

function GroupChat() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const { conversationId } = useParams(); // Extract conversationId from URL
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // State to hold messages
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupName, setGroupName] = useState({});

  // Map through groups object from groupConvoRes.data.groups to find the group name that matches the conversationId
  const getGroupName = (conversationId) => {
    const group = groupName.groups.find(
      (group) => group.id === parseInt(conversationId, 10)
    );
    return group ? group.name : "Unknown Group";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [participantsRes, messagesRes, groupConvoRes] = await Promise.all(
          [
            axios.get(`/groups/${conversationId}/participants`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`/groups/${conversationId}/messages`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get("/groups/conversations", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]
        );

        console.log(participantsRes.data.participants);
        console.log(messagesRes.data.messages);
        console.log(groupConvoRes.data);
        setParticipants(participantsRes.data.participants);
        setMessages(messagesRes.data.messages);
        setGroupName(groupConvoRes.data);

        // Emit 'messageSeen' for all messages not yet seen by the current user
        messagesRes.data.messages.forEach((msg) => {
          if (!msg.seenBy.includes(user.id)) {
            socket.emit("groupMarkAsSeen", {
              conversationId,
              messageId: msg.id,
              userId: user.id,
            });
          }
        });
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const intervalId = setInterval(fetchData, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [conversationId, token, user.id]);

  // Handle incoming messages via socket
  useEffect(() => {
    if (socket && conversationId) {
      socket.emit("joinConversation", conversationId);
    }

    const handleTyping = (data) => {
      const { userId } = data;
      if (userId !== user.id) {
        setTypingUsers((prev) => {
          if (!prev.includes(userId)) {
            return [...prev, userId];
          }
          return prev;
        });
      }
    };

    const handleStopTyping = (data) => {
      const { userId } = data;
      setTypingUsers((prev) => prev.filter((id) => id !== userId));
    };

    const handleNewMessage = (message) => {
      if (
        parseInt(message.conversationId, 10) === parseInt(conversationId, 10)
      ) {
        setMessages((prev) => {
          if (!prev.find((msg) => msg.id === message.id)) {
            return [...prev, message];
          }
          return prev;
        });
      }
    };

    const handleGroupMessageSeen = (updatedMessage) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === updatedMessage.id ? updatedMessage : msg
        )
      );
    };

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("newMessage", handleNewMessage);
    socket.on("groupMessageSeen", handleGroupMessageSeen);

    return () => {
      socket.emit("leaveConversation", conversationId);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("newMessage", handleNewMessage);
      socket.off("groupMessageSeen", handleGroupMessageSeen);
    };
  }, [conversationId, user.id]);

  // Handle input changes and emit typing events
  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (e.target.value && !isTyping) {
      setIsTyping(true);
      socket.emit("typing", {
        conversationId,
        userId: user.id,
      });
    } else if (!e.target.value && isTyping) {
      setIsTyping(false);
      socket.emit("stopTyping", {
        conversationId,
        userId: user.id,
      });
    }
  };

  // Send message function
  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      const res = await axios.post(
        `/groups/${conversationId}/message`,
        { content: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInput("");

      if (isTyping) {
        setIsTyping(false);
        socket.emit("stopTyping", {
          conversationId,
          userId: user.id,
        });
      }

      socket.emit("groupMarkAsSeen", {
        conversationId,
        messageId: res.data.message.id,
        userId: user.id,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message.");
    }
  };

  // Navigate back to inbox or previous page
  const handleBack = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 dark:text-white">Loading...</div>
    );
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="w-full min-h-screen dark:bg-gray-800">
      <div className="container mx-auto p-4 flex flex-col h-screen dark:bg-gray-800">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600 focus:outline-none w-32"
        >
          Back
        </button>

        {/* Group Chat Title */}
        <h1 className="text-2xl font-bold mb-4 dark:text-white">
          {getGroupName(conversationId)}
        </h1>

        {/* Group Chat Members */}
        <h1 className="text-2xl font-bold mb-4 dark:text-white">
          Group Members: {participants.map((p) => p.user.username).join(", ")}
        </h1>

        {/* Messages Section */}
        <ReactScrollableFeed className="flex-1 overflow-y-auto mb-4">
          {messages.length > 0 ? (
            messages.map((msg, index) => {
              const isCurrentUserSender = msg.senderId === user.id;
              const nextMessage = messages[index + 1];

              // Check if this is the last message sent by the current user
              const isLastMessageByUser =
                isCurrentUserSender &&
                (!nextMessage || nextMessage.senderId !== user.id);

              const sender = participants.find(
                (participant) => participant.user.id === msg.senderId
              );

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
                    {/* Sender's Profile Picture */}
                    <div className="relative flex-shrink-0">
                      {!isCurrentUserSender && sender && (
                        <img
                          src={`http://localhost:3000${
                            sender.user.profilePicture || "/default-avatar.png"
                          }`}
                          alt="Sender Profile"
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1">
                      <p className="break-words">
                        <strong>
                          {sender ? sender.user.username : "Unknown"}:
                        </strong>{" "}
                        {msg.content}
                      </p>
                      <p className="text-xs text-gray-600 text-end">
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                      {/* Show 'Seen By' indicator if applicable */}
                      {isLastMessageByUser &&
                        isCurrentUserSender &&
                        Array.isArray(msg.seenBy) &&
                        msg.seenBy.length > 0 && (
                          <p className="text-xs text-green-500">
                            Seen by{" "}
                            {msg.seenBy.length <= 2
                              ? msg.seenBy
                                  .map((userId) => {
                                    const userObj = participants.find(
                                      (p) => p.user.id === userId
                                    )?.user;
                                    return userObj
                                      ? userObj.username
                                      : "Unknown";
                                  })
                                  .join(" and ")
                              : `${
                                  participants
                                    .filter((p) =>
                                      msg.seenBy.includes(p.user.id)
                                    )
                                    .map((p) => p.user.username)[0]
                                } + ${msg.seenBy.length - 1} others`}
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
              No messages yet. Start the conversation!
            </p>
          )}
        </ReactScrollableFeed>

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <p className="text-gray-500 italic">
            {typingUsers
              .map(
                (id) =>
                  participants.find((p) => p.user.id === id)?.user.username
              )
              .join(", ")}{" "}
            {typingUsers.length > 1 ? "are" : "is"} typing...
          </p>
        )}

        {/* Input Field */}
        <div className="flex">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={handleInputChange}
            className="border p-2 rounded-l w-full focus:outline-none dark:bg-gray-700 dark:text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 rounded-r disabled:bg-gray-400 hover:bg-blue-600 focus:outline-none"
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupChat;
