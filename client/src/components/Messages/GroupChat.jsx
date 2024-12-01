// GroupChat.jsx
import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import useParams
import socket from "../../api/socket";
import AuthContext from "../../context/AuthContext";
import axios from "../../api/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faCircle,
  faSmile,
  faTimes,
  faEllipsis,
  faReply,
  faPaperclip,
} from "@fortawesome/free-solid-svg-icons";
import AddParticipantModal from "./AddParticipantModal";
import RemoveParticipantModal from "./RemoveParticipantModal";
import GiveAdminRightsModal from "./GiveAdminRightsModal";
import InputEmoji from "react-input-emoji";
import AllGroupMessagesModal from "./AllGroupMessagesModal";
import Picker from "emoji-picker-react";
import "../../App.css";
import MediaPreview from "./MediaPreview";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedReactionGroup, setSelectedReactionGroup] = useState(null);
  const [showReactionPopup, setShowReactionPopup] = useState(false);
  const [selectedReactionMessageId, setSelectedReactionMessageId] =
    useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const handleScroll = () => {
    if (scrollableRef.current) {
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
        if (msg.id && !msg.seenBy.includes(user.id)) {
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

    // Set an interval to fetch online users every 10 seconds
    const intervalId = setInterval(fetchOnlineUsers, 10000);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
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
      console.log("New message received:", message);
      if (
        parseInt(message.conversationId, 10) === parseInt(conversationId, 10)
      ) {
        setMessages((prev) => {
          if (!prev.find((msg) => msg.id === message.id)) {
            return [...prev, message];
          }
          return prev;
        });

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

  const handleParticipantEvent = useCallback((event, username) => {
    setParticipantEvents((prevEvents) => [...prevEvents, { event, username }]);
  }, []);

  const handleParticipantAdded = useCallback(
    ({ groupId, username }) => {
      handleParticipantEvent("been added", username);
      fetchParticipants(); // Update participants state
    },
    [handleParticipantEvent, fetchParticipants]
  );

  const handleParticipantRemoved = useCallback(
    ({ groupId, username }) => {
      handleParticipantEvent("been removed", username);
      fetchParticipants(); // Update participants state
    },
    [handleParticipantEvent, fetchParticipants]
  );

  const handleAdminRightsGiven = useCallback(
    ({ groupId, username }) => {
      handleParticipantEvent("received admin rights", username);
      fetchParticipants(); // Update participants state
    },
    [handleParticipantEvent, fetchParticipants]
  );

  const handleParticipantLeft = useCallback(
    ({ groupId, username }) => {
      handleParticipantEvent("left", username);
      fetchParticipants(); // Update participants state
    },
    [handleParticipantEvent, fetchParticipants]
  );

  // Function to handle adding a reaction in GroupChat.jsx
  const handleAddGroupReaction = async (messageId, emoji) => {
    try {
      await axios.post(
        `/groups/${conversationId}/messages/${messageId}/reactions`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update local state or handle response as needed
      setShowEmojiPicker(false);
      setSelectedMessageId(null);
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  // Function to handle removing a reaction in GroupChat.jsx
  const handleRemoveGroupReaction = async (messageId) => {
    try {
      await axios.delete(`/groups/${messageId}/reactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Update local state or handle response as needed
      setShowReactionPopup(false);
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  };

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

    // Listen for reaction events
    socket.on("groupReactionAdded", (reaction) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === reaction.messageId
            ? {
                ...msg,
                reactions: [...(msg.reactions || []), reaction],
              }
            : msg
        )
      );
    });

    socket.on("groupReactionRemoved", ({ messageId, userId }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                reactions: msg.reactions.filter((r) => r.userId !== userId),
              }
            : msg
        )
      );
    });

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

      socket.off("groupReactionAdded");
      socket.off("groupReactionRemoved");

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
    if (!input.trim() && !media) {
      return;
    }

    if (isSending) {
      return; // Prevent multiple sends
    }

    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append("content", input.trim());

      if (replyingTo) {
        formData.append("replyToMessageId", replyingTo.id);
      }

      if (media) {
        formData.append("media", media);
      }

      const res = await axios.post(
        `/groups/${conversationId}/message`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setInput("");
      setReplyingTo(null);
      setMediaPreview(null);
      setMedia(null);

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
    } finally {
      setIsSending(false);
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

  // Open AllGroupMessagesModal
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Check if the current user is an admin of the group
  const isAdmin = participants.some(
    (participant) => participant.isAdmin && participant.user.id === user.id
  );

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMedia(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleImageClick = (imageUrl) => {
    const fullImageUrl = `${import.meta.env.VITE_REACT_APP_API_URL}${imageUrl}`;
    setSelectedImageUrl(fullImageUrl);
    setIsImageModalOpen(true);
  };

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
          <h1 className="text-xl font-bold mb-4 dark:text-white">
            {getGroupName(conversationId)}
          </h1>

          <div className="flex flex-col items-start justify-center">
            {/* Group Chat Members */}
            <h1 className="text-lg font-semibold dark:text-white">
              Group Members:
            </h1>
            <div className="max-h-16 sm:w-64 w-48 mb-4 overflow-y-auto border rounded bg-white dark:bg-gray-700">
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
            onClick={openModal}
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

              const userReaction = msg.reactions?.find(
                (reaction) => reaction.userId === user.id
              );

              return (
                <div
                  key={msg.id}
                  className={`p-2 my-2 rounded mb-6 ${
                    isCurrentUserSender
                      ? "bg-blue-200 ml-auto text-right"
                      : "bg-gray-200"
                  } max-w-md relative`}
                >
                  {/* Display replied message */}
                  {msg.replyToMessage && (
                    <div className="p-2 mb-2 bg-gray-400 rounded-lg">
                      <p className="text-sm text-gray-900">
                        <strong className="text-black">
                          {msg.replyToMessage.sender.username}:
                        </strong>{" "}
                        {msg.replyToMessage.content}
                      </p>
                      {/* Display media if present in the replied message */}
                      {msg.replyToMessage.mediaUrl && (
                        <div className="mt-2">
                          <MediaPreview
                            mediaUrl={msg.replyToMessage.mediaUrl}
                            onClick={() =>
                              handleImageClick(msg.replyToMessage.mediaUrl)
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Display media if present in the current message */}
                  {msg.mediaUrl && (
                    <div className="mt-2">
                      <MediaPreview
                        mediaUrl={msg.mediaUrl}
                        onClick={() => handleImageClick(msg.mediaUrl)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 items-start">
                    <div className="relative flex-shrink-0 ml-4">
                      {!isCurrentUserSender && sender && (
                        <img
                          src={`${import.meta.env.VITE_REACT_APP_API_URL}${
                            sender.user.profilePicture || "/default-avatar.png"
                          }`}
                          alt="Sender Profile"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      {onlineStatusToggle &&
                        !isCurrentUserSender &&
                        sender &&
                        onlineUsers.some(
                          (user) => user.id === sender.user.id
                        ) && (
                          <span>
                            <FontAwesomeIcon
                              icon={faCircle}
                              className="text-green-500 text-xs absolute bottom-0 right-0"
                            />
                          </span>
                        )}
                    </div>
                    <div className="flex-1 relative">
                      <p className="break-all break-words overflow-hidden mr-8 whitespace-pre-wrap max-w-full">
                        <strong>
                          {sender ? sender.user.username : "removed"}:
                        </strong>{" "}
                        {msg.content}
                      </p>
                      {/* Reply Button */}
                      <button
                        onClick={() => handleReply(msg)}
                        className="text-gray-500 absolute right-0 top-0"
                      >
                        <FontAwesomeIcon icon={faReply} />
                      </button>
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
                                  } + ${seenByOthers.length - 1} other`}
                            </p>
                          ) : null;
                        })()}
                    </div>
                  </div>

                  {/* Reactions */}
                  <div className="relative">
                    {/* Reaction details popup */}
                    {showReactionPopup &&
                      selectedReactionGroup &&
                      selectedReactionMessageId === msg.id && (
                        <div className="absolute top-0 left-1 bg-white p-2 rounded shadow-lg z-50">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold">Reactions</h3>
                            <FontAwesomeIcon
                              icon={faTimes}
                              className="text-gray-500 cursor-pointer"
                              onClick={() => {
                                setShowReactionPopup(false);
                                setSelectedReactionMessageId(null);
                              }}
                            />
                          </div>
                          {Object.values(
                            selectedReactionGroup.reduce((acc, reaction) => {
                              if (acc[reaction.emoji]) {
                                acc[reaction.emoji].count += 1;
                                acc[reaction.emoji].users.push({
                                  username: reaction.user.username,
                                  userId: reaction.userId,
                                });
                              } else {
                                acc[reaction.emoji] = {
                                  emoji: reaction.emoji,
                                  count: 1,
                                  users: [
                                    {
                                      username: reaction.user.username,
                                      userId: reaction.userId,
                                    },
                                  ],
                                };
                              }
                              return acc;
                            }, {})
                          ).map((group, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between mb-1"
                            >
                              <div className="w-32 text-start">
                                <span className="text-xs text-gray-600">
                                  {group.users
                                    .map((user) => user.username)
                                    .join(", ")}
                                </span>
                                <span>
                                  {group.emoji} x{group.count}
                                </span>
                              </div>
                              {group.users.some(
                                (u) => u.userId === user.id
                              ) && (
                                <FontAwesomeIcon
                                  icon={faTimes}
                                  className="text-red-500 cursor-pointer text-end"
                                  onClick={() =>
                                    handleRemoveGroupReaction(
                                      selectedReactionMessageId
                                    )
                                  }
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    <div className="relative">
                      {/* Reaction button */}
                      {!userReaction && (
                        <button
                          onClick={() => {
                            setSelectedMessageId(msg.id);
                            setShowEmojiPicker((prev) =>
                              prev !== msg.id ? msg.id : null
                            );
                          }}
                          className="absolute bottom-0 left-0 text-md text-gray-500"
                        >
                          <FontAwesomeIcon icon={faSmile} />
                        </button>
                      )}
                      {/* Reactions display on the left side with counts */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap absolute -top-2 left-0 items-center space-x-1 mt-1 ml-4">
                          {Object.values(
                            msg.reactions.reduce((acc, reaction) => {
                              if (acc[reaction.emoji]) {
                                acc[reaction.emoji].count += 1;
                                acc[reaction.emoji].users.push(
                                  reaction.user.username
                                );
                                acc[reaction.emoji].userIds.push(
                                  reaction.userId
                                );
                              } else {
                                acc[reaction.emoji] = {
                                  emoji: reaction.emoji,
                                  count: 1,
                                  users: [reaction.user.username],
                                  userIds: [reaction.userId],
                                };
                              }
                              return acc;
                            }, {})
                          )
                            .slice(0, 3) // Limit to 3 reactions
                            .map((group, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-1 bg-gray-300 rounded text-sm cursor-pointer"
                                onClick={() => {
                                  setSelectedReactionGroup(msg.reactions);
                                  setSelectedReactionMessageId(msg.id);
                                  setShowReactionPopup(true);
                                }}
                              >
                                <span className="text-md">
                                  <span className="text-md">{group.emoji}</span>{" "}
                                  x{group.count}
                                </span>
                              </div>
                            ))}
                          {Object.keys(msg.reactions).length > 3 && (
                            <button
                              className="text-blue-500 text-2xl"
                              onClick={() => {
                                setSelectedReactionGroup(msg.reactions);
                                setSelectedReactionMessageId(msg.id);
                                setShowReactionPopup(true);
                              }}
                            >
                              <FontAwesomeIcon icon={faEllipsis} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Emoji Picker */}
                  {showEmojiPicker === msg.id &&
                    selectedMessageId === msg.id && (
                      <div className="absolute top-16 left-1 z-50 overflow-auto w-72 sm:w-96">
                        <button
                          className="text-white px-2 ml-2 bg-red-500 text-lg z-50"
                          onClick={() => setShowEmojiPicker(false)}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                        <Picker
                          className="z-50"
                          onEmojiClick={(emojiObject, event) => {
                            if (emojiObject && emojiObject.emoji) {
                              handleAddGroupReaction(msg.id, emojiObject.emoji);
                            } else {
                              console.error(
                                "Emoji object is undefined or missing emoji property"
                              );
                            }
                          }}
                          disableAutoFocus={true}
                          native={true}
                        />
                      </div>
                    )}
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
        <div className="flex flex-col items-center justify-center">
          {replyingTo && (
            <div className="flex items-center p-2 bg-gray-100 border-l-4 border-blue-500">
              <div className="flex-1">
                <p className="text-sm truncate w-64">
                  Replying to <strong>{replyingTo.sender.username}</strong>:{" "}
                  {replyingTo.content}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-500 ml-2"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          )}
          {mediaPreview && (
            <div className="mb-4">
              <div className="relative inline-block">
                <img
                  src={mediaPreview}
                  alt="Selected Media"
                  className="max-w-xs h-auto"
                />
                <button
                  onClick={() => {
                    setMedia(null);
                    setMediaPreview(null);
                  }}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>
          )}

          <InputEmoji
            value={input}
            onChange={handleInputChange}
            cleanOnEnter
            onEnter={sendMessage}
            placeholder="Type a message..."
          />

          <div className="w-full flex justify-center items-center">
            <button
              onClick={sendMessage}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl disabled:bg-gray-400 hover:bg-blue-600 focus:outline-none w-full ml-3"
              disabled={(!input.trim() && !media) || isSending}
            >
              {isSending ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </div>
              ) : (
                "Send"
              )}
            </button>
            {/* Media Upload Button */}
            <label
              htmlFor="media-upload"
              className="cursor-pointer text-gray-500 ml-3 mr-3"
            >
              <FontAwesomeIcon icon={faPaperclip} size="xl" />
              <input
                type="file"
                id="media-upload"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <AllGroupMessagesModal
        isOpen={isModalOpen}
        onClose={closeModal}
        groupId={conversationId}
        token={token}
      />

      {isImageModalOpen && selectedImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <button
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-3 right-3 text-red-600 text-2xl"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
          <div className="relative flex flex-col items-center justify-center w-full overflow-auto">
            <img
              src={selectedImageUrl}
              alt="Full-size"
              className="fullImage object-contain"
            />

            <a
              href={selectedImageUrl}
              download
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded inline-block text-center"
            >
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupChat;
