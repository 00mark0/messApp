// api/firebase.js
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

// Load service account key
const serviceAccountPath = path.resolve(__dirname, process.env.SERVICE_ACCOUNT_KEY_PATH);

let serviceAccount;

try {
  serviceAccount = require(serviceAccountPath);
  console.log("Service account loaded successfully.");
} catch (err) {
  console.error("Error loading service account key:", err);
  process.exit(1); // Exit if service account cannot be loaded
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase admin initialized.");
} catch (err) {
  console.error("Error initializing Firebase admin:", err);
  process.exit(1); // Exit if Firebase Admin fails to initialize
}

export default admin;