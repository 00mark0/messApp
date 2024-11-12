import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import AuthContext from "../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

function Inbox() {
  const { token, user } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const navigate = useNavigate();

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

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Inbox</h2>

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

          return (
            <div
              key={conv.id}
              className="p-2 flex justify-between items-center cursor-pointer hover:bg-gray-200
                dark:hover:bg-gray-600 rounded-lg mb-2 
              "
              onClick={() =>
                openConversation(conv.id, otherParticipant.user.id)
              }
            >
              <div>
                <p
                  className="
                    font-semibold 
                    dark:text-white 
                "
                >
                  {otherParticipant?.user.username || "Unknown User"}
                </p>
                <p
                  className="text-gray-600 
                    dark:text-gray-400 truncate w-52 
                "
                >
                  {lastMessage ? lastMessage.content : "No messages yet"}
                </p>
              </div>
              {lastMessage && !lastMessage.seenBy.includes(user.id) && (
                <span className="text-red-500">●</span>
              )}
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
