import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircle,
  faSmile,
  faTimes,
  faReply,
  faPaperclip,
} from "@fortawesome/free-solid-svg-icons";
import socket from "../../api/socket";
import InputEmoji from "react-input-emoji";
import AllMessagesModal from "./AllMessagesModal";
import Picker from "emoji-picker-react";
import MediaPreview from "./MediaPreview";
import "../../App.css";

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

  const markAsSeen = useCallback(() => {
    socket.emit("markAsSeen", {
      conversationId,
      userId: user.id,
    });
  }, [conversationId, user.id]);

  // Function to handle adding a reaction
  const handleAddReaction = async (messageId, emoji) => {
    console.log("Adding reaction:", emoji);
    try {
      await axios.post(
        `/messages/${messageId}/reactions`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowEmojiPicker(false);
      setSelectedMessageId(null);
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  // Function to handle removing a reaction
  const handleRemoveReaction = async (messageId) => {
    try {
      await axios.delete(`/messages/${messageId}/reactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowReactionPopup(false);
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  };

  useEffect(() => {
    // Join conversation room
    socket.emit("joinConversation", conversationId);

    // Listen for incoming messages
    socket.on("newMessage", handleReceiveMessage);

    // Listen for messages seen
    socket.on("messagesSeen", handleMessagesSeen);

    // Listen for typing events
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    // Listen for reaction events
    socket.on("reactionAdded", (reaction) => {
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

    socket.on("reactionRemoved", ({ messageId, userId }) => {
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

    // Cleanup on unmount or when dependencies change
    return () => {
      socket.off("newMessage", handleReceiveMessage);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("reactionAdded");
      socket.off("reactionRemoved");
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

  useEffect(() => {
    if (messages.length > 0 && distanceFromBottom < SCROLL_THRESHOLD) {
      const debounceMarkAsSeen = setTimeout(() => {
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
    if (!input.trim() && !media) {
      console.log("No input or media; function returns early.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("content", input.trim());
      if (replyingTo) {
        formData.append("replyToMessageId", replyingTo.id);
      }
      if (media) {
        formData.append("media", media);
      } else {
        console.log("No media to append");
      }

      const response = await axios.post(`/messages/${recipientId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Do not set 'Content-Type', let Axios handle it
        },
      });

      console.log("Message sent successfully:", response.data);

      if (conversationId === "new") {
        navigate(`/chat/${response.data.conversationId}/${recipientId}`);
      }

      setInput("");
      setMedia(null);
      setMediaPreview(null);
      setIsTyping(false);
      setReplyingTo(null);
      socket.emit("stopTyping", {
        conversationId,
        userId: user.id,
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message.");
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const handleBack = () => {
    navigate("/");
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
            onClick={openModal}
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

              // Get user's reaction to this message
              const userReaction = msg.reactions?.find(
                (reaction) => reaction.userId === user.id
              );

              return (
                <div
                  key={msg.id}
                  className={`p-2 my-2 rounded ${
                    isCurrentUserSender
                      ? "bg-blue-200 ml-auto text-right"
                      : "bg-gray-200"
                  } max-w-md relative break-words`}
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
                    <div className="relative flex-shrink-0 ml-2">
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
                    <div className="flex-1 relative">
                      {/* Display message content if present */}
                      {msg.content && (
                        <p className="break-all break-words overflow-hidden mr-8 whitespace-pre-wrap max-w-full">
                          {msg.content}
                        </p>
                      )}
                      {/* Reply Button */}
                      <button
                        onClick={() => handleReply(msg)}
                        className="text-gray-500 absolute right-0 top-0"
                      >
                        <FontAwesomeIcon icon={faReply} />
                      </button>
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
                              className="text-gray-500 cursor-pointer ml-2"
                              onClick={() => {
                                setShowReactionPopup(false);
                                setSelectedReactionMessageId(null);
                              }}
                            />
                          </div>
                          {selectedReactionGroup.users.map(
                            (username, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between mb-1"
                              >
                                <div className="flex gap-1">
                                  <span>{username}</span>
                                  <span>{selectedReactionGroup.emoji}</span>
                                </div>
                                {selectedReactionGroup.userIds[index] ===
                                  user.id && (
                                  <FontAwesomeIcon
                                    icon={faTimes}
                                    className="text-red-500 cursor-pointer"
                                    onClick={() => handleRemoveReaction(msg.id)}
                                  />
                                )}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    {/* Reaction button */}
                    {!userReaction && (
                      <button
                        onClick={() => {
                          setSelectedMessageId(msg.id);
                          setShowEmojiPicker((prev) =>
                            prev !== msg.id ? msg.id : null
                          );
                        }}
                        className="absolute top-0 left-0 text-md text-gray-500"
                      >
                        <FontAwesomeIcon icon={faSmile} />
                      </button>
                    )}
                    {/* Reactions display on the left side with counts */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap absolute top-0 left-2 items-center space-x-1 mt-1 ml-4">
                        {Object.values(
                          msg.reactions.reduce((acc, reaction) => {
                            if (acc[reaction.emoji]) {
                              acc[reaction.emoji].count += 1;
                              acc[reaction.emoji].users.push(
                                reaction.user.username
                              );
                              acc[reaction.emoji].userIds.push(reaction.userId);
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
                        ).map((group, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-1 bg-gray-300 rounded text-sm cursor-pointer"
                            onClick={() => {
                              setSelectedReactionGroup(group);
                              setSelectedReactionMessageId(msg.id);
                              setShowReactionPopup(true);
                            }}
                          >
                            <span>
                              {group.emoji} x{group.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
                              handleAddReaction(msg.id, emojiObject.emoji);
                            } else {
                              console.error(
                                "Emoji object is undefined or missing emoji property"
                              );
                            }
                          }}
                          native={true}
                          autoFocusSearch={false}
                        />
                      </div>
                    )}
                  <p className="text-xs text-gray-600 text-end items-end mr-6">
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
        </div>

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
              className="bg-blue-500 text-white px-4 py-2 rounded-xl disabled:bg-gray-400 w-full ml-3"
              disabled={!input.trim() && !media}
            >
              Send
            </button>
            {/* Media Upload Button */}
            <label
              htmlFor="media-upload"
              className="cursor-pointer text-gray-500 mr-3 ml-3"
            >
              <FontAwesomeIcon icon={faPaperclip} size="xl" />
              <input
                type="file"
                id="media-upload"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="hidden"
                name="media-upload"
              />
            </label>
          </div>
        </div>
      </div>
      <AllMessagesModal
        isOpen={isModalOpen}
        onClose={closeModal}
        conversationId={conversationId}
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

export default Chat;
