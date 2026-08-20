import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA6PUTRqGsAMk9m5AxP2hRXxN_iURAGs1Y",
  authDomain: "paulinho-pastel.firebaseapp.com",
  projectId: "paulinho-pastel",
  storageBucket: "paulinho-pastel.firebasestorage.app",
  messagingSenderId: "851347737001",
  appId: "1:851347737001:web:cf39e6f218a4d465b81cb8",
  measurementId: "G-N05V06BDNG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
