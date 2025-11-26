/**
 * Firebase Admin SDK initialization
 * Adapted from utils/firebase.js for Discord bot use
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;

  try {
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Use project ID from environment if available
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      // Fallback: use default credentials (for Firebase emulator or GCP)
      admin.initializeApp();
    }
  } catch (err) {
    console.error('Firebase initialization error:', err.message);
    console.log('Ensure FIREBASE_SERVICE_ACCOUNT env var is set or running against emulator');
  }
}

const db = admin.firestore();
const storage = admin.storage();

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
}

module.exports = {
  admin,
  db,
  storage,
};

