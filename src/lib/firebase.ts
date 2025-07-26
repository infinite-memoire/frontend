import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAdb3-xGIFIjy50RDKUNJ7ky4EQWz6H5tE",
  authDomain: "infinite-memoire-dev.firebaseapp.com",
  projectId: "infinite-memoire-dev",
  storageBucket: "infinite-memoire-dev.firebasestorage.app",
  messagingSenderId: "32272011394",
  appId: "1:32272011394:web:ec436ad5fb69fc39b9dfbe",
  measurementId: "G-K0ZXXDFMF0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;