// GroupInbox.jsx
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserPlus,
  faUserMinus,
  faAdd,
  faX,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import socket from "../../api/socket";

function GroupInbox() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [filter, setFilter] = useState("");
  const [groupConvos, setGroupConvos] = useState([]);

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
      setIsMenuOpen(false);
    } catch (err) {
      console.log(err);
    }
  };

  // Filter contacts based on input
  const filteredContacts = contacts.filter((contact) =>
    contact.username.toLowerCase().includes(filter.toLowerCase())
  );

  // Fetch group convos
  useEffect(() => {
    const fetchGroupConvos = async () => {
      try {
        const res = await axios.get("/groups/conversations", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Sort the groups by last message date
        const sortedGroups = res.data.groups.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return (
            new Date(b.lastMessage.timestamp) -
            new Date(a.lastMessage.timestamp)
          );
        });

        console.log(res.data.groups);
        setGroupConvos(sortedGroups);
      } catch (err) {
        console.error(err);
      }
    };

    fetchGroupConvos();
  }, [token]);

  // Join group conversation rooms
  useEffect(() => {
    if (socket && groupConvos.length > 0) {
      groupConvos.forEach((group) => {
        socket.emit("joinConversation", group.id.toString());
      });
    }

    return () => {
      if (socket && groupConvos.length > 0) {
        groupConvos.forEach((group) => {
          socket.emit("leaveConversation", group.id.toString());
        });
      }
    };
  }, [groupConvos]);

  // Handle incoming new message events
  useEffect(() => {
    // Correct the property in handleNewMessage
    const handleNewMessage = (message) => {
      setGroupConvos((prevConvos) =>
        prevConvos.map((group) => {
          if (group.id === message.conversationId) {
            return {
              ...group,
              lastMessage: message,
              unseenMessages: (group.unseenMessages || 0) + 1,
            };
          }
          return group;
        })
      );
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, []);

  const handleGroupClick = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  const handleGroupDelete = async (groupId) => {
    try {
      await axios.delete(`/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const updatedGroups = groupConvos.filter((group) => group.id !== groupId);
      setGroupConvos(updatedGroups);
    } catch (err) {
      console.error(err);
    }
  };

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
        <div className="flex gap-8 mt-4">
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
                className="w-full dark:text-gray-800 px-4 py-2 border rounded"
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
                        type="button"
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
      <h2 className="text-xl font-bold mt-8">Group Conversations</h2>
      <div className="space-y-4 rounded">
        {groupConvos.map((group) => (
          <div
            key={group.id}
            className="flex items-center gap-4 p-4 border rounded cursor-pointer"
            onClick={() => handleGroupClick(group.id)}
          >
            <div className="relative">
              {group.participants.slice(0, 2).map((participant, index) => (
                <img
                  key={participant.id}
                  src={
                    participant.profilePicture
                      ? `http://localhost:3000${participant.profilePicture}`
                      : "/default-avatar.png"
                  }
                  alt="profile picture"
                  className={`w-10 h-10 rounded-full border-2 border-white ${
                    index === 0 ? "z-10" : "z-0 -ml-4 -mt-4"
                  }`}
                />
              ))}
            </div>
            <div className="flex-1">
              <h3 className="font-bold">{group.name}</h3>
              {group.lastMessage ? (
                <p className="text-sm text-gray-600">
                  {group.unseenMessages > 0
                    ? `${group.unseenMessages} new messages`
                    : group.lastMessage.content}
                </p>
              ) : (
                <p className="text-sm text-gray-600">No messages yet</p>
              )}
            </div>
            {group.participants.some(
              (participant) => participant.isAdmin && participant.id === user.id
            ) && (
              <button
                className="text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGroupDelete(group.id);
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GroupInbox;
