// src/Firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";

// 🔥 IMPORTANT: 'export' keyword lagaya hai taaki dusri files is config ko use kar sakein
export const firebaseConfig = {
  apiKey: "AIzaSyDgFq-X1V2tgGocqVzD_On6yT2OxPrFMOE",
  authDomain: "oms-and-excel-automation.firebaseapp.com",
  projectId: "oms-and-excel-automation",
  storageBucket: "oms-and-excel-automation.firebasestorage.app",
  messagingSenderId: "999073369754",
  appId: "1:999073369754:web:f462d08bbea27706ea9923",
  measurementId: "G-BKVGN32H8Q"
};

// 1. Firebase App Initialize
const app = initializeApp(firebaseConfig);

// 2. Services Export
export const auth = getAuth(app); 
export const db = getFirestore(app);