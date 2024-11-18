import { useState, useEffect, useContext } from "react";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserPlus,
  faUserMinus,
  faAdd,
  faX,
} from "@fortawesome/free-solid-svg-icons";

function GroupInbox() {
  const { token } = useContext(AuthContext);
  const [contacts, setContacts] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [filter, setFilter] = useState("");

  // Fetch contacts when the menu is open
  useEffect(() => {
    if (isMenuOpen) {
      const fetchContacts = async () => {
        try {
          const res = await axios.get("/contacts", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          setContacts(res.data.contacts);
        } catch (err) {
          console.log(err);
        }
      };

      fetchContacts();
    }
  }, [isMenuOpen, token]);

  // Toggle the menu
  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  // Add participant to group
  const addParticipant = (contactId) => {
    setGroupParticipants((prev) => [...prev, contactId]);
  };

  // Remove participant from group
  const removeParticipant = (contactId) => {
    setGroupParticipants((prev) => prev.filter((id) => id !== contactId));
  };

  // Create group function
  const createGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "/groups/create",
        {
          name: groupName,
          participants: groupParticipants,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(res.data);

      // Reset state variables
      setGroupName("");
      setGroupParticipants([]);
    } catch (err) {
      console.log(err);
    }
  };

  // Filter contacts based on input
  const filteredContacts = contacts.filter((contact) =>
    contact.username.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-4">
      <button onClick={toggleMenu} className="text-white">
        {isMenuOpen ? (
          <FontAwesomeIcon
            icon={faX}
            className="bg-red-500 py-2 px-3 rounded text-xl"
          />
        ) : (
          <FontAwesomeIcon
            icon={faAdd}
            className="bg-blue-500 py-2 px-3 rounded text-xl"
          />
        )}
      </button>

      {isMenuOpen && (
        <div className="flex gap-8">
          <div className="w-1/2">
            <h2 className="text-xl font-bold mb-4">Contacts</h2>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter Contacts"
              className="w-full px-4 py-2 border rounded mb-4"
            />
            <ul className="space-y-4 max-h-64 overflow-y-auto">
              {filteredContacts
                .filter((contact) => !groupParticipants.includes(contact.id))
                .map((contact) => (
                  <li key={contact.id} className="flex items-center gap-4">
                    <img
                      src={
                        contact.profilePicture
                          ? `http://localhost:3000${contact.profilePicture}`
                          : "/default-avatar.png"
                      }
                      alt="profile picture"
                      className="w-12 h-12 rounded-full"
                    />
                    <p className="flex-1">{contact.username}</p>
                    <button
                      onClick={() => addParticipant(contact.id)}
                      className="bg-green-500 text-white px-2 py-1 rounded"
                    >
                      <FontAwesomeIcon icon={faUserPlus} />
                    </button>
                  </li>
                ))}
            </ul>
          </div>

          <div className="w-1/2">
            <h2 className="text-xl font-bold mb-4">Create Group</h2>
            <form onSubmit={createGroup} className="space-y-4">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group Name"
                className="w-full px-4 py-2 border rounded"
                required
              />
              <div className="flex flex-wrap gap-4 mt-4">
                {groupParticipants.map((participantId) => {
                  const participant = contacts.find(
                    (contact) => contact.id === participantId
                  );
                  return (
                    <div
                      key={participantId}
                      className="flex items-center gap-2 p-2 border rounded"
                    >
                      <img
                        src={
                          participant?.profilePicture
                            ? `http://localhost:3000${participant.profilePicture}`
                            : "/default-avatar.png"
                        }
                        alt="profile picture"
                        className="w-8 h-8 rounded-full"
                      />
                      <p>{participant?.username}</p>
                      <button
                        onClick={() => removeParticipant(participantId)}
                        className="bg-red-500 text-white px-2 py-1 rounded"
                      >
                        <FontAwesomeIcon icon={faUserMinus} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Render the convos you are a member of, redirect to group chat of that convo on click*/}
    </div>
  );
}

export default GroupInbox;
