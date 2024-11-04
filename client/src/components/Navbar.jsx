import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faTimes } from "@fortawesome/free-solid-svg-icons";
import axios from "../api/axios";
import AuthContext from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import "../App.css"; // Import the CSS file

function Navbar() {
  const { logout, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get("/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data.user);
      } catch (err) {
        setError("Failed to fetch user profile.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsMenuOpen(false); // Close menu after logout
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (loading) return null; // Optionally, add a loading spinner here

  return (
    <nav className="navbar bg-gray-800 dark:bg-gray-900">
      <div className="container mx-auto flex justify-between items-center px-4 py-2">
        <Link to="/" className="text-2xl font-bold">
          MessengerApp
        </Link>
        <button className="focus:outline-none" onClick={toggleMenu}>
          <FontAwesomeIcon icon={isMenuOpen ? faTimes : faBars} size="xl" />
        </button>
      </div>

      <div
        ref={menuRef}
        className={`menu ${isMenuOpen ? "open" : "close"} dark:bg-gray-200`}
      >
        <div className="menu-content">
          {user ? (
            <>
              <Link to="/profile" onClick={toggleMenu}>
                <img
                  src={
                    user.profilePicture
                      ? `http://localhost:3000${user.profilePicture}`
                      : "/default-avatar.png"
                  }
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover"
                />
              </Link>
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="hover:underline text-xl focus:outline-none text-red-500"
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
