// GroupChat.jsx
import { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import useParams
import socket from "../../api/socket";
import AuthContext from "../../context/AuthContext";
import axios from "../../api/axios";
import ReactScrollableFeed from "react-scrollable-feed";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import AddParticipantModal from "./AddParticipantModal";
import RemoveParticipantModal from "./RemoveParticipantModal";
import GiveAdminRightsModal from "./GiveAdminRightsModal";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isRemoveParticipantOpen, setIsRemoveParticipantOpen] = useState(false);
  const [isGiveAdminRightsOpen, setIsGiveAdminRightsOpen] = useState(false);
  const groupId = conversationId;
  const [participantEvents, setParticipantEvents] = useState([]);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [messagesRes, groupConvoRes] = await Promise.all([
          axios.get(`/groups/${conversationId}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("/groups/conversations", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

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

    fetchParticipants();
    fetchData();
  }, [conversationId, token, user.id, fetchParticipants]);

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

        console.log("Emitting groupMarkAsSeen for message:", message.id);
        // Emit 'groupMarkAsSeen' immediately after receiving a new message
        socket.emit("groupMarkAsSeen", {
          conversationId,
          messageId: message.id,
          userId: user.id,
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

    const handleParticipantEvent = (event, userId) => {
      const participant = participants.find((p) => p.user.id === userId);
      const username = participant
        ? participant.user.username
        : `User ${userId}`;
      setParticipantEvents((prevEvents) => [
        ...prevEvents,
        { event, username },
      ]);
    };

    // Participant Event Handlers
    const handleParticipantAdded = (userId) => {
      handleParticipantEvent("been added", userId);
      fetchParticipants(); // Update participants state
    };

    const handleParticipantRemoved = (userId) => {
      handleParticipantEvent("been removed", userId);
      fetchParticipants(); // Update participants state
    };

    const handleAdminRightsGiven = (userId) => {
      handleParticipantEvent("received admin rights", userId);
      fetchParticipants(); // Update participants state
    };

    const handleParticipantLeft = (userId) => {
      handleParticipantEvent("left", userId);
      fetchParticipants(); // Update participants state
    };

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("newMessage", handleNewMessage);
    socket.on("groupMessageSeen", handleGroupMessageSeen);

    socket.on("participantAdded", handleParticipantAdded);
    socket.on("participantRemoved", handleParticipantRemoved);
    socket.on("adminRightsGiven", handleAdminRightsGiven);
    socket.on("participantLeft", handleParticipantLeft);

    return () => {
      socket.emit("leaveConversation", conversationId);
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
    user.id,
    participants,
    token,
    groupId,
    fetchParticipants,
  ]);

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
                          src={`${import.meta.env.VITE_REACT_APP_API_URL}${
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
