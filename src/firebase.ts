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

console.log('Firebase Initialization:', {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  source: firebaseAppletConfig.firestoreDatabaseId ? 'Config File' : (import.meta.env.VITE_FIRESTORE_DATABASE_ID ? 'Environment Variable' : 'Default')
});

if (!firebaseConfig.apiKey) {
  console.error('Firebase configuration is missing or invalid. Please check environment variables or firebase-applet-config.json');
}

const app = initializeApp(firebaseConfig);
console.log('Firebase Project ID:', firebaseConfig.projectId);
console.log('Firestore Database ID:', firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Initialize Firestore with settings for better compatibility in iframes/restricted networks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const storage = getStorage(app);
console.log('Storage Bucket:', firebaseConfig.storageBucket);
export const googleProvider = new GoogleAuthProvider();

// Connection test with retry logic
async function testConnection(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Testing connection to Firestore (Attempt ${i + 1}/${retries})...`);
      // Use getDocFromServer to force a network check
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log('Firestore connection successful');
      return;
    } catch (error: any) {
      console.error(`Firestore connection test attempt ${i + 1} failed:`, error);
      
      // If it's a 'not-found' error, it means we actually reached the server!
      if (error.code === 'not-found' || error.message?.includes('not-found')) {
        console.log('Firestore connection test: Document not found (this is expected, but it means we connected!)');
        return;
      }

      // If it's an offline or network error, retry with backoff
      if ((error.message?.includes('offline') || error.message?.includes('network')) && i < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        console.log(`Firestore connection test: Client is offline, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (i === retries - 1) {
        console.error("Final Firestore connection test failed.");
      }
    }
  }
}
testConnection();
