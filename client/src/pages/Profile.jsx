import { useState, useEffect, useContext, useCallback } from "react";
import debounce from "lodash/debounce";
import axios from "../api/axios";
import AuthContext from "../context/AuthContext";
import PasswordReset from "../components/Profile/PasswordReset";
import { useNavigate } from "react-router-dom";
import ToggleSwitch from "../components/ToggleSwitch";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle } from "@fortawesome/free-solid-svg-icons";
import { messaging, getToken } from "../firebaseConfig"; // Ensure messaging is exported
import socket from "../api/socket"; // Ensure socket is correctly imported

function Profile() {
  const navigate = useNavigate();
  const { token, logout, onlineStatusToggle, setOnlineStatusToggle } =
    useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pushNotificationStatus, setPushNotificationStatus] = useState(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isSettingUpNotifications, setIsSettingUpNotifications] =
    useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get("/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data.user);
        setUsername(response.data.user.username);
        setEmail(response.data.user.email);
        setOnlineStatusToggle(response.data.user.isVisible);
      } catch (err) {
        setError("Failed to fetch user profile.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [token, setOnlineStatusToggle]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (isUpdatingProfile) return;

    setIsUpdatingProfile(true);
    try {
      const response = await axios.put(
        "/user/profile",
        { username, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(response.data.user);
      setUpdateMessage("Profile updated successfully.");
      setEditMode(false);
    } catch (err) {
      setUpdateMessage("Failed to update profile.");
      console.error(err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleFileChange = (e) => {
    setProfilePicture(e.target.files[0]);
  };

  const handleUploadPicture = async (e) => {
    e.preventDefault();
    if (!profilePicture || isUploadingPicture) return;

    setIsUploadingPicture(true);
    const formData = new FormData();
    formData.append("profilePicture", profilePicture);

    try {
      const response = await axios.post(
        "/user/upload-profile-picture",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setUser(response.data.user);
      setUploadMessage("Profile picture uploaded successfully.");
      setProfilePicture(null);
    } catch (err) {
      setUploadMessage("Failed to upload profile picture.");
      console.error(err);
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await axios.delete("/user/delete-account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      logout();
      navigate("/login");
    } catch (err) {
      setUpdateMessage("Failed to delete account.");
      console.error(err);
    }
  };

  const debouncedStatusToggle = useCallback(
    debounce(async (newStatus) => {
      try {
        await axios.put(
          "/auth/online",
          { isVisible: newStatus },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (err) {
        console.error("Failed to update online status", err);
      } finally {
        setIsTogglingStatus(false);
      }
    }, 500),
    [token]
  );

  const handleOnlineStatusToggle = () => {
    if (isTogglingStatus) return;

    setIsTogglingStatus(true);
    const newStatus = !onlineStatusToggle;
    setOnlineStatusToggle(newStatus);
    debouncedStatusToggle(newStatus);
  };

  // Handler for manual push notification setup
  const handleSetupPushNotifications = async () => {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushNotificationStatus("Permission denied for notifications.");
        return;
      }

      // Get FCM token
      const currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_REACT_APP_VAPID_KEY,
      });

      if (currentToken) {
        // Emit the token to the server via Socket.IO
        socket.emit("register_fcm_token", currentToken);
        setPushNotificationStatus("Push notifications set up successfully.");
        console.log("Emitted register_fcm_token with token:", currentToken);
      } else {
        setPushNotificationStatus(
          "No registration token available. Please try again."
        );
      }
    } catch (error) {
      console.error("Error setting up push notifications:", error);
      setPushNotificationStatus(
        "Failed to set up push notifications. Please try again."
      );
    }
  };

  // Ensure socket connection is established
  useEffect(() => {
    if (user && token && !socket.connected) {
      socket.auth = { token }; // Use JWT token for authentication
      socket.connect();

      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });

      // Handle authentication errors from the server
      socket.on("authentication_error", (msg) => {
        console.error("Authentication Error:", msg);
        // Optionally, handle token refresh or redirect to login
      });

      // Clean up on unmount
      return () => {
        socket.off("connect");
        socket.off("connect_error");
        socket.off("authentication_error");
        socket.disconnect();
      };
    }
  }, [user, token]);

  // Initialize Firebase Messaging on component mount
  useEffect(() => {
    if (user && token) {
      const initializeFirebase = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            const currentToken = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_REACT_APP_VAPID_KEY,
            });
            if (currentToken) {
              console.log("Current FCM token:", currentToken);
              // Register FCM token via Socket.IO
              socket.emit("register_fcm_token", currentToken);
              console.log(
                "Emitted register_fcm_token with token:",
                currentToken
              );
            } else {
              console.log(
                "No registration token available. Request permission to generate one."
              );
            }
          } else {
            console.log("Notification permission not granted.");
          }
        } catch (err) {
          console.log("An error occurred while retrieving token.", err);
        }
      };

      initializeFirebase();
    }
  }, [user, token]);

  if (loading) return <p className="text-center mt-4">Loading...</p>;
  if (error) return <p className="text-center mt-4 text-red-500">{error}</p>;

  return (
    <>
      <div className="min-h-screen mx-auto dark:bg-gray-800">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
            Profile
          </h2>
          <div className="flex items-center mb-4">
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
                className="w-24 h-24 rounded-full object-cover mr-4"
              />
              {onlineStatusToggle && (
                <FontAwesomeIcon
                  icon={faCircle}
                  className="text-green-500 text-xl absolute bottom-1 right-5"
                />
              )}
            </div>
            <div>
              <p className="text-xl text-gray-800 dark:text-gray-200">
                {user.username}
              </p>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setEditMode(!editMode)}
              disabled={isUpdatingProfile}
              className={`bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mb-4 ${
                isUpdatingProfile ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isUpdatingProfile
                ? "Updating..."
                : editMode
                ? "Cancel"
                : "Edit Profile"}
            </button>

            <div className="flex flex-col justify-center items-center mb-4">
              <span className="text-gray-800 dark:text-gray-200 mr-2">
                Online Status
              </span>
              <ToggleSwitch
                isOn={onlineStatusToggle}
                handleToggle={handleOnlineStatusToggle}
              />
            </div>
          </div>

          {editMode && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-200">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-200">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className={`w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md ${
                  isUpdatingProfile ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isUpdatingProfile ? "Saving..." : "Save Changes"}
              </button>
            </form>
          )}
          {updateMessage && (
            <p className="mt-2 text-center text-green-500">{updateMessage}</p>
          )}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Change Profile Picture
            </h3>
            <form onSubmit={handleUploadPicture}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 dark:text-gray-200
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100  
                "
              />
              <button
                type="submit"
                disabled={isUploadingPicture || !profilePicture}
                className={`mt-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded ${
                  isUploadingPicture || !profilePicture
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {isUploadingPicture ? "Uploading..." : "Upload Picture"}
              </button>
            </form>
          </div>
          <PasswordReset />

          {/* Manual Push Notification Setup */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Push Notifications
            </h3>
            <button
              onClick={handleSetupPushNotifications}
              disabled={isSettingUpNotifications}
              className={`bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded ${
                isSettingUpNotifications ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSettingUpNotifications
                ? "Setting up..."
                : "Set Up Push Notifications"}
            </button>
            {pushNotificationStatus && (
              <p className="mt-2 text-center text-green-500">
                {pushNotificationStatus}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="mt-6 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            Delete Account
          </button>

          {showDeleteModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Confirm Account Deletion
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Are you sure you want to delete your account? This action
                  cannot be undone.
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 dark:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 rounded bg-red-500 text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Profile;
