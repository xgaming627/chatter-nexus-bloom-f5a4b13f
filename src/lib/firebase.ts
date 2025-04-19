
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

export { auth, db, googleProvider };
