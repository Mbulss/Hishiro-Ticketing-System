import { initializeApp } from "firebase/app";

import {
  getFirestore,
  query,
  getDocs,
  collection,
  where,
  addDoc,
} from "firebase/firestore";

import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD_wczNWr-iQ4EJCe4yICkNzPFlK663oY0",
  authDomain: "hishiro-40963.firebaseapp.com",
  projectId: "hishiro-40963",
  storageBucket: "hishiro-40963.firebasestorage.app",
  messagingSenderId: "954909722491",
  appId: "1:954909722491:web:976ddc7851485bda335fde",
  measurementId: "G-7TL3C8EF59"
};

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const provider = new GoogleAuthProvider()
// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw error;
  }
};

// Register with email and password
export const registerWithEmailAndPassword = async (
  email,
  password
) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(result.user, {
      url: 'http://localhost:5173/verify-email'
    });
    return result.user;
  } catch (error) {
    throw error;
  }
};

// Login with email and password
export const logInWithEmailAndPassword = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await result.user.reload();
    if (!result.user.emailVerified) {
      await signOut(auth); // SignS out if email not verified
      throw new Error("Please verify your email before logging in.");
    }
    return result.user;
  } catch (error) {
    throw error;
  }
};

// Send password reset email
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};

// Logout
export const logout = () => {
  signOut(auth)
}

export { auth, db };

