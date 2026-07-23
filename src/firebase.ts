import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyAnysb3aPovF2bi5z1X0n_Q7rSGkAK4TaQ",
  authDomain: "khaki-phosphene-x67s8.firebaseapp.com",
  projectId: "khaki-phosphene-x67s8",
  storageBucket: "khaki-phosphene-x67s8.firebasestorage.app",
  messagingSenderId: "74800645842",
  appId: "1:74800645842:web:0c2017296c58b2c6e2cf0b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-de200182-a30a-4f85-9773-24c8b44f3922");
