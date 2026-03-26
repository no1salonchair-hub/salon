import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

if (!firebaseConfig || !firebaseConfig.apiKey) {
  console.error('Firebase configuration is missing or invalid. Please check firebase-applet-config.json');
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
export const googleProvider = new GoogleAuthProvider();

// Connection test
async function testConnection() {
  try {
    console.log('Testing connection to Firestore (Database: ' + (firebaseConfig.firestoreDatabaseId || '(default)') + ')...');
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firestore connection successful');
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. The client is offline.");
      }
      if (error.message.includes('not-found')) {
        console.log('Firestore connection test: Document not found (this is expected if the test doc doesn\'t exist, but it means we connected!)');
      }
    }
  }
}
testConnection();
