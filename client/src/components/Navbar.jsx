import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faTimes,
  faInbox,
  faCircle,
} from "@fortawesome/free-solid-svg-icons";
import axios from "../api/axios";
import AuthContext from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import "../App.css";
import socket from "../api/socket";

function Navbar() {
  const { logout, token, user, onlineStatusToggle } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await axios.get("/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(response.data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token, fetchUserProfile]);

  // Memoized Event Handler Functions
  const handleConnect = useCallback(() => {
    console.log("Connected to WebSocket");
  }, []);

  const handleNotification = useCallback((data) => {
    setNotifications((prev) => [data, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const handleContactRequest = useCallback((data) => {
    setNotifications((prev) => [
      {
        id: data.id,
        content: `${data.username} has sent you a contact request.`,
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const handleGroupMessageNotification = useCallback((data) => {
    setNotifications((prev) => [data, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  // useEffect to Set Up Socket Event Listeners
  useEffect(() => {
    socket.on("connect", handleConnect);
    socket.on("notification", handleNotification);
    socket.on("contact-request", handleContactRequest);
    socket.on("groupMessageNotification", handleGroupMessageNotification);

    // Cleanup function to remove event listeners
    return () => {
      socket.off("connect", handleConnect);
      socket.off("notification", handleNotification);
      socket.off("contact-request", handleContactRequest);
      socket.off("groupMessageNotification", handleGroupMessageNotification);
    };
  }, [
    handleConnect,
    handleNotification,
    handleContactRequest,
    handleGroupMessageNotification,
  ]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get("/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(response.data.notifications);
        const unread = response.data.notifications.filter(
          (notif) => !notif.read
        ).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const handleInboxClick = async () => {
    setShowNotifications(!showNotifications);

    if (!showNotifications) {
      try {
        // Collect all unread notif IDs
        const unreadNotificationIds = notifications
          .filter((notif) => !notif.read)
          .map((notif) => notif.id);

        if (unreadNotificationIds.length > 0) {
          // Send a req to mark all unread notifs as read
          await axios.post(
            "/notifications/mark-as-read",
            { notificationIds: unreadNotificationIds },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Update local state
          setUnreadCount(0);
          setNotifications((prev) =>
            prev.map((notif) => ({ ...notif, read: true }))
          );
        }
      } catch (err) {
        console.error("Failed to mark notifications as read", err);
      }
    }
  };

  // Memoized handleClickOutside Function
  const handleClickOutside = useCallback((event) => {
    if (
      notificationsRef.current &&
      !notificationsRef.current.contains(event.target)
    ) {
      setShowNotifications(false);
    }

    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setIsMenuOpen(false);
    }
  }, []);

  // useEffect to Add and Remove Event Listener for Click Outside
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleNotificationClick = (notif) => {
    if (notif.content.includes("group")) {
      localStorage.setItem("selectedTab", "groupChat");
      navigate("/");
    } else if (notif.content.includes("message")) {
      localStorage.setItem("selectedTab", "chat");
      navigate("/");
    } else if (notif.content.includes("contact request")) {
      navigate("/contacts");
    }
    setShowNotifications(false);
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        "/auth/logout",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      logout();
      navigate("/login");
      setIsMenuOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (loading) return null;

  return (
    <nav className="navbar bg-gray-800 dark:bg-gray-900">
      <div className="container mx-auto flex justify-between items-center px-4 py-2">
        <Link to="/" className="text-2xl font-bold">
          MessApp
        </Link>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button onClick={handleInboxClick}>
              <FontAwesomeIcon icon={faInbox} size="xl" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div
                ref={notificationsRef}
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden z-20"
              >
                <ul className="max-h-80 overflow-y-auto">
                  {notifications
                    .filter((notif) => !notif.isRead)
                    .map((notif) => (
                      <li
                        key={notif.id}
                        className={`px-4 py-2 border-b dark:border-gray-600 ${
                          notif.isRead ? "bg-gray-100" : "bg-white"
                        }`}
                      >
                        <Link
                          to={
                            notif.content.includes("contact request")
                              ? "/contacts"
                              : "/"
                          }
                          className="block"
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <p className="text-sm text-gray-800">
                            {notif.content}
                          </p>
                          <span className="text-xs text-gray-500">
                            {new Date(notif.createdAt).toLocaleString()}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
          <button className="focus:outline-none" onClick={toggleMenu}>
            <FontAwesomeIcon icon={isMenuOpen ? faTimes : faBars} size="xl" />
          </button>
        </div>
      </div>

      <div
        ref={menuRef}
        className={`menu ${isMenuOpen ? "open" : "close"} dark:bg-gray-200`}
      >
        <div className="menu-content">
          {profile && (
            <>
              <Link
                to="/profile"
                onClick={toggleMenu}
                className="flex flex-col items-center justify-center"
              >
                <div className="relative">
                  <img
                    src={
                      user.profilePicture
                        ? `${import.meta.env.VITE_REACT_APP_API_URL}${
                            user.profilePicture
                          }`
                        : "/default-avatar.png"
                    }
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover mr-4"
                  />
                  {onlineStatusToggle && (
                    <FontAwesomeIcon
                      icon={faCircle}
                      className="text-green-500 text-md absolute bottom-0 right-3"
                    />
                  )}
                </div>
                <p
                  className="
                  text-xl
                  font-semibold
                  dark:text-gray-900
                  mt-2 
                "
                >
                  {profile.username}
                </p>
              </Link>
              <ThemeToggle />
              <Link
                to="/contacts"
                onClick={toggleMenu}
                className="hover:underline text-xl focus:outline-none dark:text-gray-900"
              >
                Contacts
              </Link>
              <button
                onClick={handleLogout}
                className="hover:underline text-xl focus:outline-none text-red-500"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
