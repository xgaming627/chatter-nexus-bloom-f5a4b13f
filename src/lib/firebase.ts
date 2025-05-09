
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  Timestamp,
  memoryLocalCache,
  initializeFirestore
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

// Initialize Firestore with simple memory cache to avoid any restrictions
const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});

// No security rules or restrictions
console.log("Firebase initialized with no restrictions");

const googleProvider = new GoogleAuthProvider();

// Helper function to delete old messages (older than 3 days)
const deleteOldMessages = async () => {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Delete old regular messages
    const oldMessagesQuery = query(
      collection(db, "messages"),
      where("timestamp", "<=", Timestamp.fromDate(threeDaysAgo))
    );
    
    const oldMessagesSnapshot = await getDocs(oldMessagesQuery);
    oldMessagesSnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
    
    // Delete old support messages
    const oldSupportQuery = query(
      collection(db, "supportMessages"),
      where("timestamp", "<=", Timestamp.fromDate(threeDaysAgo))
    );
    
    const oldSupportSnapshot = await getDocs(oldSupportQuery);
    oldSupportSnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
    
    // Delete old reported messages
    const oldReportedQuery = query(
      collection(db, "reportedMessages"),
      where("reportTimestamp", "<=", Timestamp.fromDate(threeDaysAgo))
    );
    
    const oldReportedSnapshot = await getDocs(oldReportedQuery);
    oldReportedSnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
    
    console.log("Old messages cleaned up successfully");
  } catch (error) {
    console.error("Error deleting old messages:", error);
  }
};

// Run cleanup on app initialization (but not on every page load)
const lastCleanup = localStorage.getItem('lastMessageCleanup');
if (!lastCleanup || Date.now() - parseInt(lastCleanup) > 86400000) { // Once per day
  deleteOldMessages();
  localStorage.setItem('lastMessageCleanup', Date.now().toString());
}

// Export initialized instances
export { auth, db, googleProvider, deleteOldMessages };
