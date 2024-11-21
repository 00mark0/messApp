import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_AXIOS_URL, // Replace with your API base URL
});

// Function to set up interceptors
export const setupInterceptors = (logout) => {
  axiosInstance.interceptors.response.use(
    (response) => {
      // Return the response if the status code is 2xx
      return response;
    },
    (error) => {
      // If the error response status is 401, log out the user
      if (error.response && error.response.status === 401) {
        logout();
      }
      return Promise.reject(error);
    }
  );
};

export default axiosInstance;
