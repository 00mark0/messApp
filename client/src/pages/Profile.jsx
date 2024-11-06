import { useState, useEffect, useContext } from "react";
import axios from "../api/axios";
import AuthContext from "../context/AuthContext";
import PasswordReset from "../components/Profile/PasswordReset";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();
  const { token, logout } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [uploadMessage, setUploadMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get("/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data.user);
        setUsername(response.data.user.username);
        setEmail(response.data.user.email);
      } catch (err) {
        setError("Failed to fetch user profile.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [token]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
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
    }
  };

  const handleFileChange = (e) => {
    setProfilePicture(e.target.files[0]);
  };

  const handleUploadPicture = async (e) => {
    e.preventDefault();
    if (!profilePicture) return;

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
            <img
              src={
                user.profilePicture
                  ? `http://localhost:3000${user.profilePicture}`
                  : "/default-avatar.png"
              }
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover mr-4"
            />
            <div>
              <p className="text-xl text-gray-800 dark:text-gray-200">
                {user.username}
              </p>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mb-4"
          >
            {editMode ? "Cancel" : "Edit Profile"}
          </button>

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
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
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
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md"
              >
                Save Changes
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
                className="mt-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded"
              >
                Upload Picture
              </button>
            </form>
          </div>
          <PasswordReset />
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
                    className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700"
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
