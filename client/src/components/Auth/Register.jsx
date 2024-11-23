import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

function Register() {
  const [credentials, setCredentials] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/auth/register", credentials);
      navigate("/login");
    } catch (err) {
      setError("Registration failed");
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
          Register
        </h1>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200">
            Username
          </label>
          <input
            type="text"
            name="username"
            value={credentials.username}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md dark:text-gra-200 dark:bg-gray-700 dark:border-gray-600"
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
            className="w-full px-3 py-2 border rounded-md dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md"
        >
          Register
        </button>

        <div className="mt-4 text-center">
          <p className="text-gray-700 dark:text-gray-200">
            Already have an account?{" "}
            <a href="/login" className="text-blue-500 hover:underline">
              Login
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

export default Register;
