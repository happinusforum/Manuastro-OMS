// src/hooks/UseAuth.jsx (ULTIMATE STABILITY FIX - Loading Synchronization)

import React, { useState, useEffect, createContext, useContext } from 'react';
// ⬅️ FIX 1: Path ko capital 'Firebase' rakha (as per your system)
import { auth, db } from '../Firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import LoadingSpinner from '../components/common/LoadingSpinner'; 

// 1. Context Creation
const AuthContext = createContext(undefined); 

// 2. Custom Hook (Remains the same)
export const useAuth = () => {
    const context = useContext(AuthContext); 
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider. Check main.jsx!');
    }
    return context;
};

// 3. Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null); 
    const [loading, setLoading] = useState(true); 

    // ⬅️ LOGIC BLOCK 1: Firebase Auth State Listener (Only updates user)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            setCurrentUser(user);
            // Loading ko true yahan nahi karte, kyunki woh Effect 2 handle karega
        });
        return unsubscribe;
    }, []);

    // ⬅️ LOGIC BLOCK 2: Firestore User Profile Fetcher (Stabilized Logic)
    useEffect(() => {
        
        // ⬅️ FIX 2: Check for existing user to start profile fetching
        if (!currentUser) {
             setUserProfile(null);
             setLoading(false); // Logged out state mein loading off
             return;
        }

        // --- Profile Fetch Start ---
        setLoading(true); // ⬅️ FIX 3: Loading ko yahan synchronously true kiya
        
        const fetchProfile = async () => {
            
            // Check db stability, though Firebase should handle this internally
            if (!db || !currentUser.uid) {
                 setUserProfile(null);
                 setLoading(false);
                 return;
            }

            try {
                const docRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(docRef); // ⬅️ CRASH POINT

                if (docSnap.exists()) {
                    const profileData = { 
                        ...docSnap.data(), 
                        uid: currentUser.uid,
                        email: currentUser.email 
                    };
                    // Photo URL safety check:
                    if (!profileData.photoURL || profileData.photoURL === '') {
                        profileData.photoURL = '/default-avatar.png';
                    }
                    setUserProfile(profileData);
                } else {
                    setUserProfile({ uid: currentUser.uid, email: currentUser.email, photoURL: '/default-avatar.png', role: 'guest' });
                }
            } catch (error) {
                console.error("Fatal Error fetching profile:", error);
                setUserProfile({ uid: currentUser.uid, email: currentUser.email, error: true, role: 'guest' });
            } finally {
                // Loading ko finally mein hi false karte hain
                setLoading(false); 
            }
        };
        
        // Function call kiya
        fetchProfile();

    }, [currentUser]); // Only runs when currentUser changes

    // 💡 VALUE: Ab context mein currentUser aur userProfile dono hain
    const value = {
        currentUser,
        userProfile, 
        loading, 
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <LoadingSpinner message="Securing connection and fetching profile..." size="40px" /> : children}
        </AuthContext.Provider>
    );
};