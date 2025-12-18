// src/api/authService.js

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from '../Firebase'; // Auth aur DB objects import kiye

// 1. User Signup Function (Naya user banana)
// NOTE: Admin/HR hi naye user banayenge, taaki role set ho sake.
export const signupUser = async (email, password, role) => {
    try {
        // Firebase Auth se user banao
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // User banne ke baad, usko Firestore mein 'role' ke saath save karo
        // Yehi woh step hai jo RBAC ki foundation hai!
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            role: role, // Role yahan set ho raha hai
            createdAt: new Date()
        });
        
        return user;

    } catch (error) {
        // Error handling for email already in use, weak password, etc.
        throw new Error(error.message);
    }
};

// 2. User Login Function
export const loginUser = async (email, password) => {
    try {
        // Firebase Auth se login karo
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;

    } catch (error) {
        // Error handling for wrong password, user not found, etc.
        throw new Error(error.message);
    }
};

// 3. User Logout Function
export const logoutUser = async () => {
    try {
        // Simple signOut function
        await signOut(auth);
        
    } catch (error) {
        throw new Error(error.message);
    }
};