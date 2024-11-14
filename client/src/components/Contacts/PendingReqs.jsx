import { useState, useEffect, useContext } from "react";
import AuthContext from "../../context/AuthContext";
import axios from "../../api/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faTimes,
  faUserFriends,
} from "@fortawesome/free-solid-svg-icons";

function PendingReqs() {
  const { token } = useContext(AuthContext);
  const [pendingReqs, setPendingReqs] = useState([]);
  const [filteredReqs, setFilteredReqs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPendingReqs = async () => {
      try {
        const response = await axios.get("/contact-requests/pending", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sortedRequests = response.data.contactRequests.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setPendingReqs(sortedRequests);
        setFilteredReqs(sortedRequests);
      } catch (err) {
        console.error("Failed to fetch pending requests", err);
      }
    };
    fetchPendingReqs();
  }, [token]);

  const respondToReq = async (requestId, action) => {
    try {
      await axios.put(
        `/contact-requests/respond/${requestId}`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingReqs(pendingReqs.filter((req) => req.id !== requestId));
      setFilteredReqs(filteredReqs.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error(`Failed to ${action} request`, err);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredReqs(
      pendingReqs.filter(
        (req) =>
          req.sender.username.toLowerCase().includes(query) ||
          req.sender.email.toLowerCase().includes(query)
      )
    );
  };

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="p-4 min-h-screen w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-50">
      <h1 className="text-2xl font-bold mb-4">Pending Requests</h1>
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearch}
        placeholder="Search requests..."
        className="mb-4 p-2 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
      {filteredReqs.length === 0 ? (
        <div className="text-center mt-24">
          <FontAwesomeIcon
            icon={faUserFriends}
            className="text-gray-400 dark:text-gray-500"
            size="6x"
          />
          <p className="text-lg mt-4">You have no pending requests.</p>
        </div>
      ) : (
        <ul className="space-y-4 max-h-64 overflow-y-auto">
          {filteredReqs.map((req) => (
            <li
              key={req.id}
              className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-700 rounded-lg shadow"
            >
              <img
                src={
                  req.profilePicture
                    ? `http://localhost:3000${req.profilePicture}`
                    : "/default-avatar.png"
                }
                alt="avatar"
                className="w-12 h-12 rounded-full"
              />
              <p className="flex-grow">{req.sender.username}</p>
              <p
                className="
                text-sm
                text-gray-500
                dark:text-gray-400
              "
              >
                {formatDate(req.createdAt)}
              </p>
              <button
                onClick={() => respondToReq(req.id, "accept")}
                className="text-green-500"
              >
                <FontAwesomeIcon icon={faCheck} size="lg" />
              </button>
              <button
                onClick={() => respondToReq(req.id, "reject")}
                className="text-red-500"
              >
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PendingReqs;
