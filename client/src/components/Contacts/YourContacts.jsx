import { useState, useEffect, useContext } from "react";
import axios from "../../api/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faUserFriends } from "@fortawesome/free-solid-svg-icons";
import AuthContext from "../../context/AuthContext";

function YourContacts() {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { token } = useContext(AuthContext);

  console.log(contacts);

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
              <img
                src={
                  contact.profilePicture
                    ? `http://localhost:3000${contact.profilePicture}`
                    : "/default-avatar.png"
                }
                alt="avatar"
                className="w-12 h-12 rounded-full"
              />
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
