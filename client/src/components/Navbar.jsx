import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faTimes, faInbox } from "@fortawesome/free-solid-svg-icons";
import axios from "../api/axios";
import AuthContext from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import "../App.css";
import io from "socket.io-client"; // Import socket.io-client

function Navbar() {
  const { logout, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
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
      setUser(response.data.user);
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

  useEffect(() => {
    const socket = io("http://localhost:3000", {
      query: { token },
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("notification", (data) => {
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

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
        // Create an array of promises to mark each notification as read
        const markReadPromises = notifications.map((notif) =>
          axios.post(
            `/notifications/${notif.id}/read`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
        );

        // Wait for all promises to resolve
        await Promise.all(markReadPromises);

        // Update local state
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, read: true }))
        );
      } catch (err) {
        console.error("Failed to mark notifications as read", err);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }

      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (loading) return null;

  return (
    <nav className="navbar bg-gray-800 dark:bg-gray-900">
      <div className="container mx-auto flex justify-between items-center px-4 py-2">
        <Link to="/" className="text-2xl font-bold">
          MessengerApp
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
                          notif.read ? "bg-gray-100" : "bg-white"
                        }`}
                      >
                        <p className="text-sm text-gray-800">{notif.content}</p>
                        <span className="text-xs text-gray-500">
                          {new Date(notif.createdAt).toLocaleString()}
                        </span>
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
          {user && (
            <>
              <Link
                to="/profile"
                onClick={toggleMenu}
                className="flex flex-col items-center justify-center"
              >
                <img
                  src={
                    user.profilePicture
                      ? `http://localhost:3000${user.profilePicture}`
                      : "/default-avatar.png"
                  }
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover"
                />
                <p
                  className="
                  text-xl
                  font-semibold
                  text-gray-800
                  dark:text-gray-900
                  mt-2 
                "
                >
                  {user.username}
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
