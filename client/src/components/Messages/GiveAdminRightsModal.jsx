import { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";

const GiveAdminRightsModal = ({ groupId, isOpen, onClose }) => {
  const { token } = useContext(AuthContext);
  const [participants, setParticipants] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await axios.get(`/groups/${groupId}/participants`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log(response.data.participants);
        setParticipants(response.data.participants);
      } catch (error) {
        console.error("Error fetching participants", error);
      }
    };
    fetchParticipants();
  }, [groupId, token]);

  const handleGiveAdminRights = async () => {
    try {
      await axios.post(
        `/groups/${groupId}/admin`,
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
      console.error("Error giving admin rights", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
          Give Admin Rights
        </h2>
        <ul className="max-h-60 overflow-y-auto mb-4">
          {participants.map((participant) => (
            <li
              key={participant.userId} // Ensure unique key
              className={`p-2 cursor-pointer flex items-center justify-between ${
                selectedUserId === participant.userId
                  ? "bg-green-100 dark:bg-green-900"
                  : ""
              } hover:bg-gray-200 dark:hover:bg-gray-700`}
              onClick={() => setSelectedUserId(participant.userId)}
            >
              <span className="text-black dark:text-white">
                {participant.user.username}
              </span>
              {selectedUserId === participant.userId && (
                <span className="text-green-500">Selected</span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button
            className="px-4 py-2 mr-2 text-gray-700 dark:text-gray-300 hover:underline"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
            onClick={handleGiveAdminRights}
            disabled={!selectedUserId}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// Props validation
GiveAdminRightsModal.propTypes = {
  groupId: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default GiveAdminRightsModal;
