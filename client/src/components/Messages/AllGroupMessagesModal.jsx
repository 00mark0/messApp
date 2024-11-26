import { useState, useEffect, useRef, useContext } from "react";
import axios from "../../api/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import AuthContext from "../../context/AuthContext";

function AllGroupMessagesModal({ isOpen, onClose, groupId, token }) {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef();

  useEffect(() => {
    if (isOpen) {
      setMessages([]); // Reset messages when modal opens
      setPage(1);
      setHasMore(true);
      fetchAllMessages(1, true); // Pass a flag to indicate initial load
    }
  }, [isOpen]);

  const fetchAllMessages = async (pageNumber, initialLoad = false) => {
    if (!listRef.current) return;
    const previousScrollHeight = listRef.current.scrollHeight;

    setLoading(true);
    try {
      const response = await axios.get(`/groups/${groupId}/messages/all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: pageNumber, limit: 50 },
      });

      // Reverse the order of messages to display most recent first
      const fetchedMessages = response.data.messages.reverse();
      setMessages((prevMessages) => [...fetchedMessages, ...prevMessages]);

      if (response.data.messages.length < 50) {
        setHasMore(false);
      }

      // Adjust scroll position
      if (initialLoad) {
        // Scroll to bottom on initial load
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 0);
      } else {
        // Maintain scroll position when loading more messages
        setTimeout(() => {
          if (listRef.current) {
            const newScrollHeight = listRef.current.scrollHeight;
            const scrollHeightDifference =
              newScrollHeight - previousScrollHeight;
            listRef.current.scrollTop += scrollHeightDifference;
          }
        }, 0);
      }
    } catch (err) {
      setError("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    fetchAllMessages(nextPage);
    setPage(nextPage);
  };

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0 && hasMore && !loading) {
      handleLoadMore();
    }
  };

  return (
    isOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="bg-white dark:bg-gray-800 w-4/5 max-w-2xl p-8 rounded-lg relative">
          <button
            onClick={onClose}
            className="absolute top-0 mt-2 right-2 text-2xl text-black dark:text-white"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
          {loading && <p>Loading messages...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && (
            <div
              className="messages-list overflow-y-auto h-96"
              onScroll={handleScroll}
              ref={listRef}
            >
              {messages.map((msg, index) => (
                <div
                  key={`${msg.id}-${index}`}
                  className={`p-2 my-2 rounded ${
                    msg.senderId === user.id
                      ? "bg-blue-200 ml-auto text-right"
                      : "bg-gray-200"
                  } max-w-md`}
                >
                  <p>
                    <strong>{msg.sender.username}:</strong>{" "}
                    {msg.content ? (
                      msg.content
                    ) : (
                      <span className="text-red-500 flex items-center">
                        <svg
                          className="h-4 w-4 mr-1"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 13h6m2 0a2 2 0 100-4H7a2 2 0 100 4h10z"
                          />
                        </svg>
                        deleted media
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  );
}

export default AllGroupMessagesModal;
