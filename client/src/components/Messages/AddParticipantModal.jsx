import { useState, useContext } from "react";
import PropTypes from "prop-types";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";

const AddParticipantModal = ({ groupId, isOpen, onClose }) => {
  const { token } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const fetchUsers = async () => {
    if (searchTerm.trim().length > 0) {
      try {
        const response = await axios.get(`/user/search?q=${searchTerm}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log(response.data.users);
        setSearchResults(response.data.users || []);
      } catch (error) {
        console.error("Error fetching users", error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddParticipant = async () => {
    try {
      await axios.post(
        `/groups/${groupId}/add`,
        { userId: selectedUserId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Optionally, refresh the group participants list
      onClose();
    } catch (error) {
      console.error("Error adding participant", error);
    }
  };

  const selectUser = (userId) => {
    setSelectedUserId(userId);
  };

  const handleClose = () => {
    setSelectedUserId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
          Add Participants
        </h2>
        <div className="flex mb-4">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full px-3 py-2 border rounded-l dark:bg-gray-700 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-r"
            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
          >
            Search
          </button>
        </div>
        <ul className="max-h-40 overflow-y-auto mb-4">
          {searchResults.map((user) => (
            <li
              key={user.id}
              className={`p-2 cursor-pointer flex items-center justify-between ${
                selectedUserId === user.id ? "bg-blue-100 dark:bg-blue-900" : ""
              } hover:bg-gray-200 dark:hover:bg-gray-700`}
              onClick={() => selectUser(user.id)}
            >
              <span className="text-black dark:text-white">
                {user.username}
              </span>
              {selectedUserId === user.id && (
                <span className="text-blue-500">Selected</span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button
            className="px-4 py-2 mr-2 text-gray-700 dark:text-gray-300 hover:underline"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
            onClick={handleAddParticipant}
            disabled={!selectedUserId}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

AddParticipantModal.propTypes = {
  groupId: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AddParticipantModal;
