// socket.js
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_REACT_APP_API_URL, {
  autoConnect: false,
});

export default socket;

/* 
// socket.js

import { io } from "socket.io-client";

const socket = io("http://your-public-ip:3000", { // Replace with your public IP and port
  withCredentials: true,
  autoConnect: false,
});

export default socket;
*/
