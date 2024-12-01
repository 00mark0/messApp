import { useState, useContext, useEffect } from "react";
import axios from "../../api/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSearch, faX } from "@fortawesome/free-solid-svg-icons";
import AuthContext from "../../context/AuthContext";
import "../../App.css";

function AddContacts() {
  const { token } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [notification, setNotification] = useState({
    message: "",
    type: "",
    show: false,
  });

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (query.length < 2) {
      setNotification({
        message: "Please enter at least 2 characters to search",
        type: "error",
        show: true,
      });
    }

    try {
      const res = await axios.get(`/user/search?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(res.data.users);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    }
  };

  const sendContactReq = async (userId) => {
    try {
      await axios.post(
        `/contact-requests/send/${userId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotification({
        message: "Contact request sent successfully",
        type: "success",
        show: true,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        message: "Failed to send contact request",
        type: "error",
        show: true,
      });
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-50">
      {notification.show && (
        <div
          className={`fixed top-20 right-4 p-4 rounded-lg shadow-lg
        transition-all duration-300 opacity-0 animate-slide-in
        ${
          notification.type === "success"
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        }`}
        >
          {notification.message}
        </div>
      )}
      <h2 className="text-2xl font-bold mb-4">Add Contacts</h2>
      <form onSubmit={handleSearch} className="flex mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
          className="flex-grow p-2 rounded-l border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-r"
        >
          <FontAwesomeIcon icon={faSearch} />
        </button>
      </form>

      {searchResults.length > 0 && (
        <button
          className="block bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded mb-2"
          onClick={() => {
            setSearchResults([]);
            setHasSearched(false);
          }}
        >
          <FontAwesomeIcon icon={faX} />
        </button>
      )}

      {hasSearched && searchResults.length === 0 ? (
        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow text-center">
          <p className="text-gray-600 dark:text-gray-300">
            No users found matching "{query}"
          </p>
        </div>
      ) : (
        searchResults.length > 0 && (
          <ul className="space-y-4 max-h-64 overflow-y-auto">
            {searchResults.map((user) => (
              <li
                key={user.id}
                className="flex items-center p-4 bg-white dark:bg-gray-700 rounded-lg shadow"
              >
                <img
                  src={
                    user.profilePicture
                      ? `${import.meta.env.VITE_REACT_APP_API_URL}${
                          user.profilePicture
                        }`
                      : "/default-avatar.png"
                  }
                  alt={user.username}
                  className="w-12 h-12 rounded-full mr-4 object-cover"
                />
                <span className="flex-grow truncate w-16">{user.username}</span>
                <button
                  onClick={() => sendContactReq(user.id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-2 rounded"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span className="ml-2">Add</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

export default AddContacts;
