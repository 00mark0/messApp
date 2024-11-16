import { useState, useContext } from "react";
import axios from "../../api/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSearch, faX } from "@fortawesome/free-solid-svg-icons";
import AuthContext from "../../context/AuthContext";

function AddContacts() {
  const { token } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.get(`/user/search?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(res.data.users);
    } catch (err) {
      console.error(err);
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
      alert("Contact request sent.");
    } catch (err) {
      console.error(err);
      alert("Failed to send contact request.");
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-50">
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
          onClick={() => setSearchResults([])}
        >
          <FontAwesomeIcon icon={faX} />
        </button>
      )}

      {searchResults.length > 0 && (
        <ul className="space-y-4 max-h-64 overflow-y-auto">
          {searchResults.map((user) => (
            <li
              key={user.id}
              className="flex items-center p-4 bg-white dark:bg-gray-700 rounded-lg shadow"
            >
              <img
                src={
                  user.profilePicture
                    ? `http://localhost:3000${user.profilePicture}`
                    : "/default-avatar.png"
                }
                alt={user.username}
                className="w-12 h-12 rounded-full mr-4"
              />
              <span className="flex-grow">{user.username}</span>
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
      )}
    </div>
  );
}

export default AddContacts;
