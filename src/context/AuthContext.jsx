// src/context/AuthContext.jsx (FINAL CODE: STABLE + SESSION FIX)

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'; 
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, // ⬅️ Login ke liye
    signOut, // ⬅️ Logout ke liye
    setPersistence, // ⬅️ Session fix ke liye
    browserSessionPersistence // ⬅️ Session fix ke liye
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../Firebase'; 
import LoadingSpinner from '../components/common/LoadingSpinner'; 

export const AuthContext = createContext(undefined); 

export const useAuth = () => {
    const context = useContext(AuthContext); 
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider.');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null); 
    const [loading, setLoading] = useState(true); 

    // 💡 Fetch Profile function (Stable Version)
    const fetchProfileData = useCallback(async (user) => {
        if (!db || !user || !user.uid) {
             setUserProfile(null);
             setLoading(false);
             return;
        }

        try {
            const userDocRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(userDocRef); 
            
            if (docSnap.exists()) {
                const profileData = { 
                    ...docSnap.data(), 
                    uid: user.uid,
                    email: user.email 
                };
                if (!profileData.photoURL || profileData.photoURL === '') {
                    profileData.photoURL = '/default-avatar.png';
                }
                setUserProfile(profileData);
            } else {
                setUserProfile({ uid: user.uid, email: user.email, role: 'guest', photoURL: '/default-avatar.png' });
            }
        } catch (error) {
            console.error("Fatal Error fetching profile:", error);
            setUserProfile({ uid: user.uid, email: user.email, error: true, role: 'guest' });
        } finally {
            setLoading(false); 
        }
    }, []); 

    // 💡 LOGIN FUNCTION (Session Persistence ke saath)
    const login = (email, password) => {
        // Ye line magic karegi: Data Session Storage me jayega, Local Storage me nahi
        return setPersistence(auth, browserSessionPersistence)
            .then(() => {
                return signInWithEmailAndPassword(auth, email, password);
            });
    };

    // 💡 LOGOUT FUNCTION
    const logout = () => {
        return signOut(auth);
    };
    
    // 1. EFFECT 1 (Auth State)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            setCurrentUser(user);
            if (!user) {
                setUserProfile(null);
                setLoading(false);
            }
        });
        return unsubscribe;
    }, []); 

    // 2. EFFECT 2 (Profile Data)
    useEffect(() => {
        if (currentUser) {
            setLoading(true); 
            fetchProfileData(currentUser); 
        }
    }, [currentUser, fetchProfileData]); 

    // Value object me login function pass kiya
    const value = { 
        currentUser, 
        userProfile, 
        loading, 
        login,  // ⬅️ Use this in LoginPage
        logout, // ⬅️ Use this in Header/Sidebar
        auth 
    };

    if (loading) {
        return <LoadingSpinner message="Authenticating..." size="50px" />;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};