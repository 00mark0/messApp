// ConversationItem.jsx
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faCircle } from "@fortawesome/free-solid-svg-icons";
import { formatDistanceToNow } from "date-fns";

const ConversationItem = React.memo(
  ({
    conv,
    user,
    contacts,
    onlineUsers,
    onlineStatusToggle,
    typingConversations,
    openConversation,
    handleDeleteConversation,
    lastMessage,
    isUnread,
    contact,
    isTyping,
    recipientId,
  }) => {
    const otherParticipant = conv.participants.find(
      (p) => p.user.id !== user.id
    );

    return (
      <div
        className={`p-2 flex justify-between items-center cursor-pointer hover:bg-gray-200
          dark:hover:bg-gray-600 rounded-lg mb-2`}
        onClick={() => openConversation(conv.id, otherParticipant.user.id)}
      >
        <div className="flex items-center">
          <div className="relative">
            <img
              src={
                contact?.profilePicture
                  ? `${import.meta.env.VITE_REACT_APP_API_URL}${
                      contact.profilePicture
                    }`
                  : "/default-avatar.png"
              }
              className="w-10 h-10 rounded-full mr-2 object-cover"
              alt="profile picture"
              loading="lazy"
            />
            {onlineUsers.some((user) => user.id === recipientId) &&
              onlineStatusToggle &&
              contacts.some((contact) => contact.id === recipientId) && (
                <span className="text-green-500 absolute top-6 left-7">
                  <FontAwesomeIcon icon={faCircle} size="xs" />
                </span>
              )}
          </div>
          <div className="flex flex-col">
            <p className="font-semibold dark:text-white text-gray-900">
              {otherParticipant?.user.username || "Unknown User"}
            </p>
            <div className="truncate w-52">
              {isTyping ? (
                <span className="italic text-gray-500">Typing...</span>
              ) : lastMessage ? (
                <div>
                  {lastMessage.senderId === user.id ? (
                    <span className="dark:text-gray-400 text-gray-600 font-normal">
                      {isUnread
                        ? "Sent " +
                          formatDistanceToNow(new Date(lastMessage.timestamp), {
                            addSuffix: true,
                          })
                        : "Seen "}
                    </span>
                  ) : (
                    <div className="flex items-center">
                      <span
                        className={`${
                          isUnread
                            ? "font-bold dark:text-white text-black"
                            : "font-normal text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {lastMessage.content
                          ? lastMessage.content
                          : "Media File"}
                      </span>
                      <span className="flex items-center dark:text-gray-400 text-gray-600 font-normal ml-2">
                        <span className="h-1 w-1 mr-2 inline-block bg-gray-600 rounded-full"></span>
                        {formatDistanceToNow(new Date(lastMessage.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                "No messages yet"
              )}
            </div>
          </div>
        </div>
        {/* Delete Conversation Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteConversation(conv.id);
          }}
          className="text-red-500 hover:text-red-700 focus:outline-none"
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>
    );
  }
);

export default ConversationItem;
