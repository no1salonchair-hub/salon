import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../firebase-applet-config.json';

// Use environment variables if available (Vercel), otherwise fallback to the JSON config
const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: firebaseAppletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseAppletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseAppletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseAppletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseAppletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || import.meta.env.VITE_FIRESTORE_DATABASE_ID || '(default)',
};

if (!firebaseConfig.apiKey) {
  console.error('Firebase configuration is missing or invalid. Please check environment variables or firebase-applet-config.json');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with settings for better compatibility in iframes/restricted networks
// We disable persistence as it often causes issues in sandboxed/iframe environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');

// Connection test as per instructions
async function testConnection() {
  try {
    console.log('Firebase: Testing connection to Firestore...');
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase: Connection test successful');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firebase: Connection test failed - the client is offline. Please check your Firebase configuration.');
    } else {
      // Skip logging for other errors, as this is simply a connection test.
      console.log('Firebase: Connection test completed with non-critical error (expected if test doc does not exist)');
    }
  }
}
testConnection();

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
