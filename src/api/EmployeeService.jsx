// src/api/employeeService.js (FINAL CODE - Admin CRUD Support)

import { db } from '../Firebase'; // ⬅️ FIX: Path ko lowercase 'firebase' rakha
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'; // ⬅️ IMPORT: setDoc import kiya
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'; // ⬅️ IMPORT: createUserWithEmailAndPassword import kiya

const auth = getAuth(); // Firebase Auth Instance

// 💡 NEW FUNCTION: Admin ke liye Auth aur Firestore profile ek saath banana
// Admin creates user with a temporary password and full profile data
export const createUserWithProfile = async (email, password, profileData) => {
    // profileData mein honge: name, role, empId, phoneNumber, address, etc.
    try {
        // 1. Firebase Authentication User Create kiya (C - Create Auth)
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Firestore Profile Document Create/Set kiya (C - Create Firestore)
        const userRef = doc(db, "users", user.uid);
        
        const dataToSave = {
            uid: user.uid,
            email: user.email,
            // 💡 Photo URL default avatar set kiya, agar profileData mein nahi hai
            photoURL: profileData.photoURL || 'https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/default-avatar.png', 
            // 💡 Admin dwara diya gaya sab data
            ...profileData, 
            createdAt: new Date(),
        };

        // setDoc use kiya naya document banane ke liye (yehi user profile hai)
        await setDoc(userRef, dataToSave); 
        
        return user;
    } catch (error) {
        // Agar Auth mein error aaya (e.g., email-already-in-use), toh woh yahan throw ho jayega
        throw new Error(error.message);
    }
};


// 💡 Employee Profile Update function (U - Update)
export const updateEmployeeProfile = async (uid, updates) => {
    // updates mein honge: name, empId, phoneNumber, address, role (Admin ke liye)
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, updates); // Firestore document update kiya
        return true;
    } catch (error) {
        throw new Error(error.message);
    }
};

// 💡 Admin ke liye user ko Auth aur Firestore se delete karna (D - Delete)
export const deleteUserCompletely = async (uid) => {
    try {
        // 1. Firestore se document delete kiya
        await deleteDoc(doc(db, "users", uid)); 
        
        // 2. Auth deletion requires Cloud Functions.
        // Ye warning zaroori hai.
        console.warn(`Auth user with UID ${uid} still exists. Delete manually in Firebase Auth, or deploy a Cloud Function for complete deletion.`);
        return true;
    } catch (error) {
        throw new Error(error.message);
    }
};