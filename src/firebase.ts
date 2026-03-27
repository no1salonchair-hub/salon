import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../firebase-applet-config.json';

// Use environment variables if available (Vercel), otherwise fallback to the JSON config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId,
};

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
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Testing connection to Firestore (Attempt ${i + 1}/${retries})...`);
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log('Firestore connection successful');
      return;
    } catch (error) {
      console.error(`Firestore connection test attempt ${i + 1} failed:`, error);
      if (error instanceof Error) {
        if (error.message.includes('not-found')) {
          console.log('Firestore connection test: Document not found (this is expected if the test doc doesn\'t exist, but it means we connected!)');
          return;
        }
        if (error.message.includes('the client is offline') && i < retries - 1) {
          console.log('Client is offline, retrying in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
      if (i === retries - 1) {
        console.error("Final Firestore connection test failed.");
      }
    }
  }
}
testConnection();
