import { useState, useEffect, useContext } from "react";
import axios from "../../api/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faUserFriends,
  faCircle,
} from "@fortawesome/free-solid-svg-icons";
import AuthContext from "../../context/AuthContext";
import socket from "../../api/socket";

function YourContacts() {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { token, onlineStatusToggle } = useContext(AuthContext);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await axios.get("/contacts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContacts(response.data.contacts);
        setFilteredContacts(response.data.contacts);
      } catch (err) {
        console.error(err);
      }
    };
    fetchContacts();
  }, [token]);

  useEffect(() => {
    if (!socket) {
      console.log("Socket not available yet");
      return;
    }

    console.log("Setting up socket event listener for contact-accepted");

    socket.on("contact-accepted", (newContact) => {
      console.log("Received contact-accepted event:", newContact);
      setContacts((prevContacts) => [...prevContacts, newContact]);
      setFilteredContacts((prevContacts) => [...prevContacts, newContact]);
    });

    return () => {
      socket.off("contact-accepted");
    };
  });

  // Fetch online users
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const response = await axios.get("/auth/online", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setOnlineUsers(response.data.onlineUsers);
      } catch (error) {
        console.error("Failed to fetch online users:", error);
      }
    };

    fetchOnlineUsers(); // Initial fetch

    const intervalId = setInterval(fetchOnlineUsers, 10000);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [token]);

  const removeContact = async (contactId) => {
    try {
      await axios.delete(`/contacts/remove/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts(contacts.filter((contact) => contact.id !== contactId));
      setFilteredContacts(
        filteredContacts.filter((contact) => contact.id !== contactId)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredContacts(
      contacts.filter(
        (contact) =>
          contact.username.toLowerCase().includes(query) ||
          contact.email.toLowerCase().includes(query)
      )
    );
  };

  return (
    <div className="p-4 min-h-screen w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-50">
      <h1 className="text-2xl font-bold mb-4">Your Contacts</h1>
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearch}
        placeholder="Search contacts..."
        className="mb-4 p-2 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
      {filteredContacts.length === 0 ? (
        <div className="text-center mt-24">
          <FontAwesomeIcon
            icon={faUserFriends}
            className="text-gray-400 dark:text-gray-500"
            size="6x"
          />
          <p className="text-lg mt-4">Your contact list is empty.</p>
        </div>
      ) : (
        <ul className="space-y-4 max-h-64 overflow-y-auto">
          {filteredContacts.map((contact) => (
            <li key={contact.id} className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={
                    contact.profilePicture
                      ? `${import.meta.env.VITE_REACT_APP_API_URL}${
                          contact.profilePicture
                        }`
                      : "/default-avatar.png"
                  }
                  alt="avatar"
                  className="w-12 h-12 rounded-full"
                />
                {onlineUsers.some((user) => user.id === contact.id) &&
                  onlineStatusToggle && (
                    <FontAwesomeIcon
                      icon={faCircle}
                      className="text-green-500 text-xs absolute bottom-0 right-0"
                    />
                  )}
              </div>
              <p>{contact.username}</p>
              <button
                onClick={() => removeContact(contact.id)}
                className="text-red-500"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default YourContacts;
