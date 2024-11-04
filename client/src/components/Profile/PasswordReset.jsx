import { useState, useContext } from "react";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";

function PasswordReset() {
  const { token } = useContext(AuthContext);
  const [message, setMessage] = useState("");

  const handlePasswordResetRequest = async () => {
    try {
      await axios.post(
        "/user/request-password-reset",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage("Password reset email sent.");
    } catch (err) {
      setMessage("Failed to send password reset email.");
      console.error(err);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Reset Password
      </h3>
      <button
        onClick={handlePasswordResetRequest}
        className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
      >
        Send Password Reset Email
      </button>
      {message && <p className="mt-2 text-center text-green-500">{message}</p>}
    </div>
  );
}

export default PasswordReset;
