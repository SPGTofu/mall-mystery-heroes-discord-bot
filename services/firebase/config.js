/**
 * Firebase Admin SDK initialization
 * Adapted from utils/firebase.js for Discord bot use
 */

const admin = require('firebase-admin');

// Get project ID from environment (use same as client SDK)
const projectId = process.env.REACT_APP_PROJECTID || process.env.FIREBASE_PROJECT_ID || 'demo-project';

// Set project ID environment variables for Firebase Admin SDK
// This must be set BEFORE initializing the Admin SDK
process.env.GCLOUD_PROJECT = projectId;
process.env.GOOGLE_CLOUD_PROJECT = projectId;

// Connect to Firebase emulators (set BEFORE initialization)
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';

// Initialize Firebase Admin SDK for emulator use
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

module.exports = {
  admin,
  db,
  storage,
};

