import { useState, useEffect, useContext } from "react";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";

function GroupInbox() {
  const { token } = useContext(AuthContext);
  const [contacts, setContacts] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  useEffect(() => {
    console.log(contacts);
  }, [contacts]);

  return (
    <div>
      <button onClick={toggleMenu}>
        {isMenuOpen ? "Close Contacts" : "Open Contacts"}
      </button>

      {isMenuOpen && (
        <div>
          <h2>Contacts</h2>
          <ul>
            {contacts.map((contact) => (
              <li key={contact.id}>{contact.username}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default GroupInbox;
