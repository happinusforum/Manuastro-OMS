// src/firebase.js

// Firebase App ko initialize karne ke liye function
import { initializeApp } from "firebase/app";

// Authentication service (login/logout) ke liye function
import { getAuth } from "firebase/auth"; 

// Firestore Database (data storage) ke liye function
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDgFq-X1V2tgGocqVzD_On6yT2OxPrFMOE",
  authDomain: "oms-and-excel-automation.firebaseapp.com",
  projectId: "oms-and-excel-automation",
  storageBucket: "oms-and-excel-automation.firebasestorage.app",
  messagingSenderId: "999073369754",
  appId: "1:999073369754:web:f462d08bbea27706ea9923",
  measurementId: "G-BKVGN32H8Q"
};

// src/firebase.js
// ... (config yahan hai) ...

// 1. Firebase App ko shuru karo (Initialize the app)
const app = initializeApp(firebaseConfig);

// 2. Ab services ko initialize karke export karo
// Yehi woh objects hain jinhe tu components mein use karega.

// 'auth' object se login, signup, logout hoga.
export const auth = getAuth(app); 

// 'db' object se data read/write hoga.
export const db = getFirestore(app); 

// Ab tu is file ko apne components mein import kar sakta hai, jaise:
// import { auth, db } from './firebase';