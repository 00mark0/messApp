import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import AuthContext from "../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { io } from "socket.io-client";
import debounce from "lodash.debounce";

function Inbox() {
  const { token, user } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const navigate = useNavigate();
  const socket = useRef(null);
  const [typingConversations, setTypingConversations] = useState([]);

  useEffect(() => {
    socket.current = io("http://localhost:3000", {
      query: { userId: user.id },
    });

    const handleTyping = debounce((data) => {
      if (data.userId !== user.id) {
        setTypingConversations((prev) => ({
          ...prev,
          [data.conversationId]: true,
        }));
      }
    }, 300);

    const handleStopTyping = debounce((data) => {
      if (data.userId !== user.id) {
        setTypingConversations((prev) => {
          const updated = { ...prev };
          delete updated[data.conversationId];
          return updated;
        });
      }
    }, 300);

    socket.current.on("typing", handleTyping);
    socket.current.on("stopTyping", handleStopTyping);

    // Listen for incoming messages
    socket.current.on("receiveMessage", (message) => {
      setConversations((prevConversations) => {
        const updatedConversations = prevConversations.map((conv) => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              messages: [message, ...conv.messages],
            };
          }
          return conv;
        });
        setFilteredConversations(updatedConversations);
        return updatedConversations;
      });
    });

    // Cleanup on unmount
    return () => {
      socket.current.off("typing", handleTyping);
      socket.current.off("stopTyping", handleStopTyping);
      socket.current.off("receiveMessage");
      socket.current.disconnect();
    };
  }, [user.id]);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await axios.get("/messages/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setConversations(response.data.conversations || []);
        setFilteredConversations(response.data.conversations || []);
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
        setConversations([]);
        setFilteredConversations([]);
      }
    };

    fetchConversations();
  }, [token]);

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

      {/* New Conversation Section */}
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
                      ? `http://localhost:3000${contact.profilePicture}`
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

      <h2 className="text-xl font-semibold mb-2">Conversations</h2>
      {filteredConversations.length > 0 ? (
        filteredConversations.map((conv) => {
          const otherParticipant = conv.participants.find(
            (p) => p.user.id !== user.id
          );

          const lastMessage = conv.messages[0];
          const isUnread = lastMessage && !lastMessage.seenBy.includes(user.id);
          const isTyping = typingConversations[conv.id];

          return (
            <div
              key={conv.id}
              className={`p-2 flex justify-between items-center cursor-pointer hover:bg-gray-200
                dark:hover:bg-gray-600 rounded-lg mb-2`}
              onClick={() =>
                openConversation(conv.id, otherParticipant.user.id)
              }
            >
              <div>
                <p
                  className="
                  font-semibold
                  dark:text-white
                  text-gray-900
                "
                >
                  {otherParticipant?.user.username || "Unknown User"}
                </p>
                <p
                  className={`truncate w-52 ${
                    isUnread
                      ? "font-bold text-white"
                      : "font-normal text-gray-600"
                  } dark:text-gray-400`}
                >
                  {isTyping ? (
                    <span className="italic text-gray-500">Typing...</span>
                  ) : lastMessage ? (
                    lastMessage.content
                  ) : (
                    "No messages yet"
                  )}
                </p>
              </div>
              {/* Remove the red dot indicator */}
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
  );
}

export default Inbox;
