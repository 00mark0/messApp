// GroupChat.jsx
import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import useParams
import socket from "../../api/socket";
import AuthContext from "../../context/AuthContext";
import axios from "../../api/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCircle } from "@fortawesome/free-solid-svg-icons";
import AddParticipantModal from "./AddParticipantModal";
import RemoveParticipantModal from "./RemoveParticipantModal";
import GiveAdminRightsModal from "./GiveAdminRightsModal";
import InputEmoji from "react-input-emoji";

function GroupChat() {
  const { user, token, onlineStatusToggle } = useContext(AuthContext);
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isRemoveParticipantOpen, setIsRemoveParticipantOpen] = useState(false);
  const [isGiveAdminRightsOpen, setIsGiveAdminRightsOpen] = useState(false);
  const groupId = conversationId;
  const [participantEvents, setParticipantEvents] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isScrolledToTop, setIsScrolledToTop] = useState(false);
  const scrollableRef = useRef(null);

  const handleScroll = () => {
    if (scrollableRef.current) {
      console.log("scrollTop:", scrollableRef.current.scrollTop);
      if (scrollableRef.current.scrollTop === 0) {
        setIsScrolledToTop(true);
      } else {
        setIsScrolledToTop(false);
      }
    }
  };

  useEffect(() => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [messages]);

  // Map through groups object from groupConvoRes.data.groups to find the group name that matches the conversationId
  const getGroupName = (conversationId) => {
    const group = groupName.groups.find(
      (group) => group.id === parseInt(conversationId, 10)
    );
    return group ? group.name : "Unknown Group";
  };

  const handleForbiddenError = () => {
    localStorage.setItem("selectedTab", "groupChat");
    navigate("/");
  };

  // Fetch Participants Function
  const fetchParticipants = useCallback(async () => {
    try {
      const response = await axios.get(
        `/groups/${conversationId}/participants`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setParticipants(response.data.participants);
    } catch (error) {
      console.error("Error fetching participants:", error);
      setError("Failed to fetch participants.");
    }
  }, [conversationId, token]);

  // Fetch Messages Function
  const fetchMessages = useCallback(async () => {
    try {
      const response = await axios.get(`/groups/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Messages:", response.data.messages);
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to fetch messages.");
    }
  }, [conversationId, token]);

  // Fetch Group Conversation Function
  const fetchGroupConvo = useCallback(async () => {
    try {
      const response = await axios.get("/groups/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroupName(response.data);
    } catch (error) {
      console.error("Error fetching group conversation:", error);
      setError("Failed to fetch group conversation.");
    }
  }, [token]);

  // Fetch Online Users Function
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const response = await axios.get("/auth/online", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Online Users:", response.data.onlineUsers);
      setOnlineUsers(response.data.onlineUsers);
    } catch (error) {
      console.error("Error fetching online users:", error);
      setError("Failed to fetch online users.");
    }
  }, [token]);

  // Mark Messages as Seen Function
  const markMessagesAsSeen = useCallback(
    (messages) => {
      messages.forEach((msg) => {
        if (!msg.seenBy.includes(user.id)) {
          socket.emit("groupMarkAsSeen", {
            conversationId,
            messageId: msg.id,
            userId: user.id,
          });
        }
      });
    },
    [conversationId, user.id]
  );

  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchMessages(),
          fetchGroupConvo(),
          fetchOnlineUsers(),
          fetchParticipants(),
        ]);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchParticipants, fetchMessages, fetchGroupConvo, fetchOnlineUsers]);

  // Mark Messages as Seen when Messages Change
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsSeen(messages);
    }
  }, [messages, markMessagesAsSeen]);

  const handleTyping = useCallback(
    (data) => {
      const { userId } = data;
      if (userId !== user.id) {
        setTypingUsers((prev) => {
          if (!prev.includes(userId)) {
            return [...prev, userId];
          }
          return prev;
        });
      }
    },
    [user.id]
  );

  const handleStopTyping = useCallback((data) => {
    const { userId } = data;
    setTypingUsers((prev) => prev.filter((id) => id !== userId));
  }, []);

  const handleNewMessage = useCallback(
    (message) => {
      if (
        parseInt(message.conversationId, 10) === parseInt(conversationId, 10)
      ) {
        setMessages((prev) => {
          if (!prev.find((msg) => msg.id === message.id)) {
            return [...prev, message];
          }
          return prev;
        });

        console.log("Emitting groupMarkAsSeen for message:", message.id);
        // Emit 'groupMarkAsSeen' immediately after receiving a new message
        socket.emit("groupMarkAsSeen", {
          conversationId,
          messageId: message.id,
          userId: user.id,
        });
      }
    },
    [conversationId, user.id]
  );

  const handleGroupMessageSeen = useCallback((updatedMessage) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === updatedMessage.id ? updatedMessage : msg
      )
    );
  }, []);

  const handleParticipantEvent = useCallback(
    (event, userId) => {
      const participant = participants.find((p) => p.user.id === userId);
      const username = participant
        ? participant.user.username
        : `User ${userId}`;
      setParticipantEvents((prevEvents) => [
        ...prevEvents,
        { event, username },
      ]);
    },
    [participants]
  );

  const handleParticipantAdded = useCallback(
    (userId) => {
      handleParticipantEvent("been added", userId);
      fetchParticipants(); // Update participants state
    },
    [handleParticipantEvent, fetchParticipants]
  );

  const handleParticipantRemoved = useCallback(
    (userId) => {
      handleParticipantEvent("been removed", userId);
      fetchParticipants(); // Update participants state
    },
    [handleParticipantEvent, fetchParticipants]
  );

  const handleAdminRightsGiven = useCallback(
    (userId) => {
      handleParticipantEvent("received admin rights", userId);
      fetchParticipants(); // Update participants state
    },
    [handleParticipantEvent, fetchParticipants]
  );

  const handleParticipantLeft = useCallback(
    (userId) => {
      handleParticipantEvent("left", userId);
      fetchParticipants(); // Update participants state
    },
    [handleParticipantEvent, fetchParticipants]
  );

  // Refactored useEffect for Socket Event Listeners
  useEffect(() => {
    if (socket && conversationId) {
      socket.emit("joinConversation", conversationId);
    }

    // Register Event Handlers
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("newMessage", handleNewMessage);
    socket.on("groupMessageSeen", handleGroupMessageSeen);

    socket.on("participantAdded", handleParticipantAdded);
    socket.on("participantRemoved", handleParticipantRemoved);
    socket.on("adminRightsGiven", handleAdminRightsGiven);
    socket.on("participantLeft", handleParticipantLeft);

    // Cleanup on Unmount
    return () => {
      if (socket && conversationId) {
        socket.emit("leaveConversation", conversationId);
      }
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("newMessage", handleNewMessage);
      socket.off("groupMessageSeen", handleGroupMessageSeen);

      socket.off("participantAdded", handleParticipantAdded);
      socket.off("participantRemoved", handleParticipantRemoved);
      socket.off("adminRightsGiven", handleAdminRightsGiven);
      socket.off("participantLeft", handleParticipantLeft);
    };
  }, [
    conversationId,
    handleTyping,
    handleStopTyping,
    handleNewMessage,
    handleGroupMessageSeen,
    handleParticipantAdded,
    handleParticipantRemoved,
    handleAdminRightsGiven,
    handleParticipantLeft,
  ]);

  // Handle input changes and emit typing events
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

  // Toggle dropdown menu
  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  // Handlers for opening modals
  const openAddParticipantModal = () => {
    setIsAddParticipantOpen(true);
    setIsDropdownOpen(false);
  };

  const openRemoveParticipantModal = () => {
    setIsRemoveParticipantOpen(true);
    setIsDropdownOpen(false);
  };

  const openGiveAdminRightsModal = () => {
    setIsGiveAdminRightsOpen(true);
    setIsDropdownOpen(false);
  };

  // Handle leaving the group
  const handleLeaveGroup = async () => {
    try {
      await axios.delete(`/groups/${groupId}/leave`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate("/");
    } catch (error) {
      console.error("Error leaving group", error);
    }
  };
  // Handlers for closing modals
  const closeAddParticipantModal = () => setIsAddParticipantOpen(false);
  const closeRemoveParticipantModal = () => setIsRemoveParticipantOpen(false);
  const closeGiveAdminRightsModal = () => setIsGiveAdminRightsOpen(false);

  // Check if the current user is an admin of the group
  const isAdmin = participants.some(
    (participant) => participant.isAdmin && participant.user.id === user.id
  );

  if (loading) {
    return (
      <div className="container mx-auto p-4 dark:text-white">Loading...</div>
    );
  }

  if (error) {
    handleForbiddenError();
    alert("Failed to load data.");
  }

  return (
    <div className="w-full min-h-screen dark:bg-gray-800">
      <div className="container mx-auto p-4 flex flex-col h-screen dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none w-32"
          >
            Back
          </button>
          {/* Dropdown Menu Icon */}
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="dark:text-white text-gray-600 focus:outline-none"
            >
              <FontAwesomeIcon icon={faBars} className="text-2xl" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-10">
                <ul className="py-1 text-black dark:text-white">
                  {isAdmin && (
                    <>
                      <li
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        onClick={openAddParticipantModal}
                      >
                        Add Participant
                      </li>
                      <li
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        onClick={openRemoveParticipantModal}
                      >
                        Remove Participant
                      </li>
                      <li
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        onClick={openGiveAdminRightsModal}
                      >
                        Give Admin Rights
                      </li>
                    </>
                  )}
                  <li
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    onClick={handleLeaveGroup}
                  >
                    Leave Group
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Modals */}
          <AddParticipantModal
            groupId={groupId}
            isOpen={isAddParticipantOpen}
            onClose={closeAddParticipantModal}
          />
          <RemoveParticipantModal
            groupId={groupId}
            isOpen={isRemoveParticipantOpen}
            onClose={closeRemoveParticipantModal}
          />
          <GiveAdminRightsModal
            groupId={groupId}
            isOpen={isGiveAdminRightsOpen}
            onClose={closeGiveAdminRightsModal}
          />
        </div>

        <div className="flex justify-between">
          {/* Group Chat Title */}
          <h1 className="text-2xl font-bold mb-4 dark:text-white">
            {getGroupName(conversationId)}
          </h1>

          <div className="flex flex-col items-start justify-center">
            {/* Group Chat Members */}
            <h1 className="text-lg font-semibold dark:text-white">
              Group Members:
            </h1>
            <div className="max-h-16 w-64 mb-4 overflow-y-auto border rounded bg-white dark:bg-gray-700">
              {participants.map((p) => (
                <div
                  key={p.user.id}
                  className="flex items-center justify-between p-2 border-b dark:border-gray-600"
                >
                  <span className="text-gray-900 dark:text-gray-100">
                    {p.user.username}
                  </span>
                  {p.isAdmin && (
                    <span className="text-xs text-white bg-blue-500 rounded-full px-2 py-1 ml-2">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {isScrolledToTop && (
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded mb-4 shadow-md w-32 mx-auto"
            onClick={() => console.log("View All clicked")}
          >
            View All
          </button>
        )}

        {/* Messages Section */}
        <div
          ref={scrollableRef}
          className="flex-1 overflow-y-auto mb-4"
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
                    {/* Sender's Profile Picture with Online Status */}
                    <div className="relative flex-shrink-0">
                      {!isCurrentUserSender && sender && (
                        <img
                          src={`${import.meta.env.VITE_REACT_APP_API_URL}${
                            sender.user.profilePicture || "/default-avatar.png"
                          }`}
                          alt="Sender Profile"
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      {onlineStatusToggle &&
                        !isCurrentUserSender &&
                        sender &&
                        onlineUsers.some(
                          (user) => user.id === sender.user.id
                        ) && (
                          <span className="absolute top-3 right-0">
                            <FontAwesomeIcon
                              icon={faCircle}
                              className="text-green-500 text-xs"
                            />
                          </span>
                        )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1">
                      <p className="break-words">
                        <strong>
                          {sender ? sender.user.username : "removed"}:
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
                        msg.seenBy.length > 0 &&
                        (() => {
                          const seenByOthers = msg.seenBy.filter(
                            (userId) => userId !== user.id
                          );
                          return seenByOthers.length > 0 ? (
                            <p className="text-xs text-green-500">
                              Seen by{" "}
                              {seenByOthers.length <= 2
                                ? seenByOthers
                                    .map((userId) => {
                                      const userObj = participants.find(
                                        (p) => p.user.id === userId
                                      )?.user;
                                      return userObj
                                        ? userObj.username
                                        : "removed";
                                    })
                                    .join(" and ")
                                : `${
                                    participants
                                      .filter((p) =>
                                        seenByOthers.includes(p.user.id)
                                      )
                                      .map((p) => p.user.username)[0]
                                  } + ${seenByOthers.length - 1} others`}
                            </p>
                          ) : null;
                        })()}
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
          {/* Render participant events */}
          {participantEvents.map((event, index) => (
            <p
              key={index}
              className="text-center text-gray-500 dark:text-gray-400 mt-4"
            >
              {event.username} has {event.event}.
            </p>
          ))}
        </div>

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
          <InputEmoji
            value={input}
            onChange={handleInputChange}
            cleanOnEnter
            onEnter={sendMessage}
            placeholder="Type a message..."
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
