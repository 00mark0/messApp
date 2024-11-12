import { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";

function Chat() {
  const { token, user } = useContext(AuthContext);
  const { conversationId, recipientId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [recipient, setRecipient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Recipient Data
        const userResponse = await axios.get(`/user/${recipientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecipient(userResponse.data.user);
        console.log(userResponse.data.user);

        // Fetch Messages if Existing Conversation
        if (conversationId !== "new") {
          const messagesResponse = await axios.get(
            `/messages/conversations/${conversationId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setMessages(messagesResponse.data.messages || []);

          // Mark Messages as Seen
          await axios.post(
            `/messages/conversations/${conversationId}/seen`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error(
          "Error fetching data:",
          err.response ? err.response.data : err.message
        );
        setError("Failed to load chat data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [conversationId, recipientId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      if (conversationId === "new") {
        // Start New Conversation
        const response = await axios.post(
          `/messages/${recipientId}`,
          { content: input },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        navigate(`/chat/${response.data.conversationId}/${recipientId}`);
      } else {
        // Send Message in Existing Conversation
        const response = await axios.post(
          `/messages/${recipientId}`,
          { content: input },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages((prev) => [...prev, response.data.message]);
        setInput("");
      }
    } catch (err) {
      console.error(
        "Error sending message:",
        err.response ? err.response.data : err.message
      );
      setError("Failed to send message.");
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="w-full min-h-screen dark:bg-gray-800">
      <div className="container mx-auto p-4 flex flex-col h-screen dark:bg-gray-800">
        <button
          onClick={() => navigate("/")}
          className="
            bg-blue-500 text-white px-4 py-2 rounded mb-4
            hover:bg-blue-600 focus:outline-none w-32 
        "
        >
          Back
        </button>
        <h1 className="text-2xl font-bold mb-4 dark:text-white">
          Chat with {recipient ? recipient.username : "User"}
        </h1>

        <div className="flex-1 overflow-y-auto mb-4">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 my-2 rounded ${
                  msg.senderId === user.id
                    ? "bg-blue-200 ml-auto text-right"
                    : "bg-gray-200"
                } max-w-md`}
              >
                <p>{msg.content}</p>
                <p className="text-xs text-gray-600">
                  {new Date(msg.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p
              className="
                text-center text-gray-500 dark:text-gray-400
                mt-4 
            "
            >
              No messages yet. Start the conversation!
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border p-2 rounded-l w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 rounded-r disabled:bg-gray-400"
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
