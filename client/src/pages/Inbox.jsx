import {
  lazy,
  useState,
  Suspense,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import AuthContext from "../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import socket from "../api/socket";
import {
  faPlus,
  faTrash,
  faCircle,
  faX,
} from "@fortawesome/free-solid-svg-icons";
import { formatDistanceToNow } from "date-fns";
const GroupInbox = lazy(() => import("../components/Messages/GroupInbox"));

function Inbox() {
  const { token, user, onlineStatusToggle } = useContext(AuthContext);
  const [selectedTab, setSelectedTab] = useState("chat");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const navigate = useNavigate();
  const [typingConversations, setTypingConversations] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [contacts, setContacts] = useState([]);

  // Function to handle tab selection
  const handleTabSelect = (tab) => {
    setSelectedTab(tab);
    localStorage.setItem("selectedTab", tab);
  };

  // Retrieve selected tab from local storage
  useEffect(() => {
    const storedTab = localStorage.getItem("selectedTab");
    if (storedTab) {
      setSelectedTab(storedTab);
    }
  }, []);

  // Memoized Event Handlers
  const handleTyping = useCallback(
    (data) => {
      const { conversationId, userId } = data;
      if (userId !== user.id) {
        setTypingConversations((prev) => ({
          ...prev,
          [conversationId]: true,
        }));
      }
    },
    [user.id]
  );

  const handleStopTyping = useCallback(
    (data) => {
      const { conversationId, userId } = data;
      if (userId !== user.id) {
        setTypingConversations((prev) => {
          const updated = { ...prev };
          delete updated[conversationId];
          return updated;
        });
      }
    },
    [user.id]
  );

  const handleReceiveMessage = useCallback((message) => {
    setConversations((prevConversations) => {
      const updatedConversations = prevConversations.map((conv) => {
        if (conv.id === message.conversationId) {
          // Insert the new message at the beginning
          const updatedMessages = [message, ...conv.messages];
          return { ...conv, messages: updatedMessages };
        }
        return conv;
      });

      // Sort conversations by last message timestamp
      const sortedConversations = updatedConversations.sort((a, b) => {
        const latestMessageA = a.messages[0];
        const latestMessageB = b.messages[0];

        return (
          new Date(latestMessageB.timestamp) -
          new Date(latestMessageA.timestamp)
        );
      });

      setFilteredConversations(sortedConversations);
      return sortedConversations;
    });
  }, []);

  const handleMessagesSeen = useCallback((data) => {
    const { conversationId, seenBy } = data;

    setConversations((prevConversations) => {
      const updatedConversations = prevConversations.map((conv) => {
        if (conv.id.toString() === conversationId.toString()) {
          // Update the last message's seenBy array
          if (conv.messages.length > 0) {
            const latestMessage = conv.messages[0];

            if (!latestMessage.seenBy.includes(parseInt(seenBy))) {
              const updatedMessages = conv.messages.map((msg, index) => {
                if (index === 0) {
                  return {
                    ...msg,
                    seenBy: [...msg.seenBy, parseInt(seenBy)],
                  };
                }
                return msg;
              });
              return { ...conv, messages: updatedMessages };
            }
          }
        }
        return conv;
      });

      // Sort conversations by last message timestamp
      const sortedConversations = updatedConversations.sort((a, b) => {
        const latestMessageA = a.messages[0];
        const latestMessageB = b.messages[0];

        return (
          new Date(latestMessageB.timestamp) -
          new Date(latestMessageA.timestamp)
        );
      });

      setFilteredConversations(sortedConversations);
      return sortedConversations;
    });
  }, []);

  // Memoized Fetch Functions
  const fetchConversations = useCallback(async () => {
    try {
      const response = await axios.get("/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Ensure messages are sorted from newest to oldest
      const conversations = (response.data.conversations || []).map((conv) => {
        const sortedMessages = conv.messages.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        return { ...conv, messages: sortedMessages };
      });

      // Sort conversations by last message timestamp
      const sortedConversations = conversations.sort((a, b) => {
        const latestMessageA = a.messages[0];
        const latestMessageB = b.messages[0];

        const timestampA = latestMessageA
          ? new Date(latestMessageA.timestamp)
          : 0;
        const timestampB = latestMessageB
          ? new Date(latestMessageB.timestamp)
          : 0;

        return timestampB - timestampA;
      });

      setConversations(sortedConversations);
      setFilteredConversations(sortedConversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      setConversations([]);
      setFilteredConversations([]);
    }
  }, [token]);

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

  const fetchContacts = useCallback(async () => {
    try {
      const response = await axios.get("/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts(response.data.contacts);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  // Socket Event Listeners Setup
  useEffect(() => {
    // Join the conversation
    if (socket && conversations.length > 0) {
      conversations.forEach((conv) => {
        if (!conv.isGroup) {
          socket.emit("joinConversation", conv.id);
        }
      });
    }

    // Register Event Handlers
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("newConversation", fetchConversations);
    socket.on("messagesSeen", handleMessagesSeen);

    // Cleanup on unmount
    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("newConversation", fetchConversations);
      socket.off("messagesSeen", handleMessagesSeen);
    };
  }, [
    conversations,
    handleTyping,
    handleStopTyping,
    handleReceiveMessage,
    handleMessagesSeen,
  ]);

  // Fetch Conversations on Mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch Online Users with Interval
  useEffect(() => {
    fetchOnlineUsers(); // Initial fetch

    const intervalId = setInterval(fetchOnlineUsers, 10000);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchOnlineUsers]);

  // Fetch Contacts with Interval
  useEffect(() => {
    fetchContacts(); // Initial fetch

    const intervalId = setInterval(fetchContacts, 10000);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchContacts]);

  // Handle search form submission
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await axios.get(`/contacts/search?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(res.data.contacts || []);
    } catch (err) {
      console.error("Failed to search contacts:", err);
      setSearchResults([]);
    }
  };

  // Redirect to chat when a user is clicked
  const handleUserClick = (userId) => {
    navigate(`/chat/new/${userId}`);
  };

  // Open existing conversation
  const openConversation = (conversationId, recipientId) => {
    navigate(`/chat/${conversationId}/${recipientId}`);
  };

  // Filter conversations by username
  const handleFilter = (e) => {
    const filterQuery = e.target.value.toLowerCase();
    setFilteredConversations(
      conversations.filter((conv) =>
        conv.participants.some((participant) =>
          participant.user.username.toLowerCase().includes(filterQuery)
        )
      )
    );
  };

  const handleDeleteConversation = async (conversationId) => {
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      try {
        await axios.delete(`/messages/conversations/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Remove the conversation from state
        setConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId)
        );
        setFilteredConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId)
        );
      } catch (error) {
        console.error("Failed to delete conversation:", error);
      }
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Inbox</h2>

      <div className="w-full flex justify-between mb-4">
        <button
          onClick={() => handleTabSelect("chat")}
          className={`px-4 py-2 mr-2 rounded ${
            selectedTab === "chat"
              ? "bg-blue-500 text-white"
              : "bg-blue-200 text-gray-500"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => handleTabSelect("groupChat")}
          className={`px-4 py-2 rounded ${
            selectedTab === "groupChat"
              ? "bg-blue-500 text-white"
              : "bg-blue-200 text-gray-500"
          }`}
        >
          Group Chat
        </button>
      </div>

      {selectedTab === "chat" ? (
        <div>
          {/* Existing Chat Content */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">New Conversation</h3>
            <form onSubmit={handleSearch} className="flex mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts..."
                className="flex-grow p-2 rounded-l border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-r"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </form>
            {searchResults.length > 0 && (
              <button
                className="block bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded mb-2"
                onClick={() => setSearchResults([])}
              >
                <FontAwesomeIcon icon={faX} />
              </button>
            )}

            {searchResults.length > 0 && (
              <ul className="space-y-4 max-h-64 overflow-y-auto mb-6">
                {searchResults.map((contact) => (
                  <li
                    key={contact.id}
                    className="flex items-center p-4 bg-white dark:bg-gray-700 rounded-lg shadow cursor-pointer"
                    onClick={() => handleUserClick(contact.id)}
                  >
                    <img
                      src={
                        contact.profilePicture
                          ? `${import.meta.env.VITE_REACT_APP_API_URL}${
                              contact.profilePicture
                            }`
                          : "/default-avatar.png"
                      }
                      alt={contact.username}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <span className="flex-grow">{contact.username}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Conversations Section */}
          <input
            type="text"
            placeholder="Filter conversations..."
            onChange={handleFilter}
            className="mb-4 p-2 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />

          <h2 className="text-xl font-semibold mb-2">Chat</h2>
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const otherParticipant = conv.participants.find(
                (p) => p.user.id !== user.id
              );

              const lastMessage = conv.messages[0];
              const isTyping = typingConversations[conv.id];

              const recipientId = otherParticipant?.user.id;

              let isUnread = false;

              if (lastMessage) {
                if (lastMessage.senderId === user.id) {
                  isUnread = !lastMessage.seenBy.includes(recipientId);
                } else {
                  isUnread = !lastMessage.seenBy.includes(user.id);
                }
              }

              const contact = contacts.find((c) => c.id === recipientId);

              return (
                <div
                  key={conv.id}
                  className={`p-2 flex justify-between items-center cursor-pointer hover:bg-gray-200
                    dark:hover:bg-gray-600 rounded-lg mb-2`}
                  onClick={() =>
                    openConversation(conv.id, otherParticipant.user.id)
                  }
                >
                  <div className="flex items-center">
                    <div className="relative">
                      <img
                        src={
                          contact?.profilePicture
                            ? `${import.meta.env.VITE_REACT_APP_API_URL}${
                                contact.profilePicture
                              }`
                            : "/default-avatar.png"
                        }
                        className="w-10 h-10 rounded-full mr-2 object-cover"
                        alt="profile picture"
                      />
                      {onlineUsers.some((user) => user.id === recipientId) &&
                        onlineStatusToggle &&
                        contacts.some(
                          (contact) => contact.id === recipientId
                        ) && (
                          <span className="text-green-500 absolute top-6 left-7">
                            <FontAwesomeIcon icon={faCircle} size="xs" />
                          </span>
                        )}
                    </div>
                    <div className="flex flex-col">
                      <p
                        className="
                      font-semibold
                      dark:text-white
                      text-gray-900
                    "
                      >
                        {otherParticipant?.user.username || "Unknown User"}
                      </p>
                      <div className="truncate w-52">
                        {isTyping ? (
                          <span className="italic text-gray-500">
                            Typing...
                          </span>
                        ) : lastMessage ? (
                          <div>
                            {lastMessage.senderId === user.id ? (
                              <span
                                className="
                              dark:text-gray-400
                              text-gray-600
                              font-normal 
                            "
                              >
                                {isUnread
                                  ? "Sent " +
                                    formatDistanceToNow(
                                      new Date(lastMessage.timestamp),
                                      {
                                        addSuffix: true,
                                      }
                                    )
                                  : "Seen "}
                              </span>
                            ) : (
                              <div className="flex items-center">
                                <span
                                  className={`
                                ${
                                  isUnread
                                    ? "font-bold dark:text-white text-black"
                                    : "font-normal text-gray-600 dark:text-gray-400"
                                }
                                `}
                                >
                                  {lastMessage.content
                                    ? lastMessage.content
                                    : "Media File"}
                                </span>
                                <span
                                  className=" flex items-center
                                dark:text-gray-400
                                text-gray-600
                                font-normal
                                ml-2
                                "
                                >
                                  <span className="h-1 w-1 mr-2 inline-block bg-gray-600 rounded-full"></span>
                                  {formatDistanceToNow(
                                    new Date(lastMessage.timestamp),
                                    {
                                      addSuffix: true,
                                    }
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          "No messages yet"
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Delete Conversation Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                    className="text-red-500 hover:text-red-700 focus:outline-none"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              );
            })
          ) : (
            <p>No conversations yet.</p>
          )}
        </div>
      ) : (
        <Suspense fallback={<p>Loading...</p>}>
          <GroupInbox />
        </Suspense>
      )}
    </div>
  );
}

export default Inbox;
