
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';

// Replace these with your Firebase configuration values
const firebaseConfig = {
  apiKey: "AIzaSyBYo239hQDi3n-2Vq0im5fcBY7iozqszmc",
  authDomain: "nexuschat-2328c.firebaseapp.com",
  projectId: "nexuschat-2328c",
  storageBucket: "nexuschat-2328c.firebasestorage.app",
  messagingSenderId: "694335433168",
  appId: "1:694335433168:web:466ee30e43caf0ef11b1d5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Enable offline persistence (reduces server operations)
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.log('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support persistence
      console.log('Persistence not supported by browser');
    }
  });
} catch (e) {
  console.error("Error enabling persistence:", e);
}

// Configure cache size
db._setSettings({
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

export { auth, db, googleProvider };
