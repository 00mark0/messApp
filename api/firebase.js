// api/firebase.js
import admin from 'firebase-admin';

// Import your service account key JSON file
import serviceAccount from './path/to/serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;