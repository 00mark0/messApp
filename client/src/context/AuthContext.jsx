import { createContext, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import axiosInstance, { setupInterceptors } from "../api/axios";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null
  );
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem("user")) || null
  );
  const navigate = useNavigate();

  const [onlineStatusToggle, setOnlineStatusToggle] = useState(() => {
    const storedValue = localStorage.getItem("onlineStatusToggle");
    if (
      storedValue === null ||
      storedValue === undefined ||
      storedValue === "undefined"
    ) {
      return true; // Default value
    }

    try {
      return JSON.parse(storedValue);
    } catch (e) {
      console.error("Error parsing onlineStatusToggle:", e);
      // Optional: Remove the invalid entry from localStorage
      localStorage.removeItem("onlineStatusToggle");
      return true; // Default value
    }
  });

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("onlineStatusToggle");
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  useEffect(() => {
    if (onlineStatusToggle !== undefined) {
      localStorage.setItem(
        "onlineStatusToggle",
        JSON.stringify(onlineStatusToggle)
      );
    }
  }, [onlineStatusToggle]);

  useEffect(() => {
    const fetchUser = async () => {
      if (token && !user) {
        try {
          const response = await axiosInstance.get("/user/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(response.data.user);
          setOnlineStatusToggle(response.data.user.isVisible);
        } catch (err) {
          console.error("Failed to fetch user profile", err);
          if (err.response && err.response.status === 401) {
            logout();
          }
        }
      }
    };

    fetchUser();
  }, [token, user, logout]);

  const login = (newToken, userInfo, rememberMe) => {
    setToken(newToken);
    setUser(userInfo);
    setOnlineStatusToggle(userInfo.isVisible);
    if (rememberMe) {
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(userInfo));
    }
  };

  useEffect(() => {
    // Set up Axios interceptors
    setupInterceptors(logout);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        onlineStatusToggle,
        setOnlineStatusToggle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { AuthContext };
export default AuthContext;
