import { useEffect, useContext, useState } from "react";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";

function SentReqs() {
  const { token } = useContext(AuthContext);
  const [sentReqs, setSentReqs] = useState([]);

  useEffect(() => {
    const fetchSentReqs = async () => {
      try {
        const response = await axios.get("/contact-requests/sent", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSentReqs(response.data.contactRequests);
      } catch (err) {
        console.error("Failed to fetch sent requests", err);
      }
    };
    fetchSentReqs();
  }, [token]);

  return (
    <div className="p-4 min-h-screen w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-50">
      <h1 className="text-2xl font-bold mb-4">Sent Requests</h1>
      <div className="grid grid-cols-1 gap-4 space-y-4 max-h-64 overflow-y-auto">
        {sentReqs.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 shadow-md rounded-lg"
          >
            <div>
              <img
                src={
                  req.profilePicture
                    ? `${import.meta.env.VITE_REACT_APP_API_URL}${
                        req.profilePicture
                      }`
                    : "/default-avatar.png"
                }
                alt="avatar"
                className="w-12 h-12 rounded-full"
              />
              <h2 className="text-lg font-semibold">{req.receiver.username}</h2>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SentReqs;
