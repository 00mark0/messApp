import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import AuthContext from "../../context/AuthContext";

function Login() {
  const [credentials, setCredentials] = useState({
    identifier: "", // Can be email or username
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: name === "rememberMe" ? checked : value,
    }));
  };

  const isEmail = (identifier) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(identifier);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = isEmail(credentials.identifier)
        ? { email: credentials.identifier }
        : { username: credentials.identifier };

      const response = await axios.post("/auth/login", {
        ...payload,
        password: credentials.password,
      });
      login(response.data.token, credentials.rememberMe);
      navigate("/");
    } catch (err) {
      setError("Invalid email/username or password");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl mb-4 text-center text-gray-800 dark:text-white">
          Login
        </h1>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200">
            Email or Username
          </label>
          <input
            type="text" // Changed from email to text
            name="identifier" // Changed from email to identifier
            value={credentials.identifier}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            name="rememberMe"
            checked={credentials.rememberMe}
            onChange={handleChange}
            className="mr-2"
          />
          <label className="text-gray-700 dark:text-gray-200">
            Remember Me
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md"
        >
          Login
        </button>

        <div className="mt-4 text-center">
          <p className="text-gray-700 dark:text-gray-200">
            Don&apos;t have an account?{" "}
            <a href="/register" className="text-blue-500 hover:underline">
              Register
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

export default Login;
