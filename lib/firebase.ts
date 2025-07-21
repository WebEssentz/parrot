// lib/firebase.ts

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from 'firebase/storage';
// We don't need getAuth here unless this file is also responsible for auth exports.

// Your web app's Firebase configuration, sourced from environment variables.
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MESURMENT_ID // Corrected spelling
};

// Initialize Firebase
// This check prevents re-initialization on hot reloads in Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export the services you need
export const storage = getStorage(app);

// If you also need authentication, you would add this:
// import { getAuth } from 'firebase/auth';
// export const auth = getAuth(app);