// src/components/auth/AuthGuard.jsx

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

/**
 * Ye component check karta hai ki user ke paas required access hai ya nahi.
 * @param {Array<string>} allowedRoles - Roles jinko access ki permission hai.
 */
const AuthGuard = ({ children, allowedRoles }) => {
    // 💡 useAuth se current user, role, aur loading state le lo
    const { currentUser, currentRole, loading } = useAuth();

    // 1. Agar data load ho raha hai, toh wait karo
    if (loading) {
        return <div>Checking permissions...</div>;
    }

    // 2. Agar user logged in nahi hai, toh Login page pe bhej do
    if (!currentUser) {
        console.log("User not logged in. Redirecting to login.");
        return <Navigate to="/login" replace />; // 'replace' history ko replace karta hai
    }

    // 3. Agar user logged in hai, toh role check karo
    if (currentRole && !allowedRoles.includes(currentRole)) {
        // Agar user logged in hai, par role allowed nahi hai
        console.warn(`Access Denied! User Role: ${currentRole}`);
        // Unauthorized user ko wapas unke dashboard pe bhej do, ya 403 page dikhao
        
        let redirectPath = '/';
        if (currentRole === 'admin') redirectPath = '/admin/dashboard';
        else if (currentRole === 'hr') redirectPath = '/hr/dashboard';
        else if (currentRole === 'employee') redirectPath = '/employee/dashboard';
        
        return <Navigate to={redirectPath} replace />;
    }

    // 4. Agar sab theek hai (login + correct role), toh children component render kar do
    return <>{children}</>;
};

export default AuthGuard;