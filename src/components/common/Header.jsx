// src/components/common/Header.jsx (FINAL POLISHED CODE)

import React from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { logoutUser } from '../../api/AuthService'; // Assuming this function handles Firebase sign-out
import NotificationBell from '../ui/NotificationBell'; 
import { useNavigate } from 'react-router-dom';

function Header() {
    // FIX: currentUser, userProfile, aur loading nikaala
    const { currentUser, userProfile, loading } = useAuth();
    const navigate = useNavigate();

    // 💡 Derived Variables (Profile se data nikaala)
    // Yehi line ensures karta hai ki user ka name/email dikhe, 'Guest' nahi
    const userName = userProfile?.name || currentUser?.email.split('@')[0] || 'Guest';
    const userRole = userProfile?.role || 'guest';
    const userEmail = currentUser?.email || 'N/A';

    // 💡 Logout handler
    const handleLogout = async () => {
        try {
            await logoutUser(); 
            navigate('/login'); 
        } catch (error) {
            console.error("Logout Error:", error.message);
            alert("Logout failed! Try again.");
        }
    };

    // 💡 Loading state mein Header ko render nahi karenge
    if (loading) {
        return null; 
    }

    return (
        <header style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '15px 30px', 
            backgroundColor: '#fff', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
            
            {/* Left Side: Page Title/User Info */}
            <div>
                {/* FIX: Welcome, USER NAME dikhaya */}
                <h1 style={{ fontSize: '1.5em', margin: 0, color: '#333', fontWeight: 'bold' }}>
                    Welcome, {userName.toUpperCase()} 
                </h1>
                {/* FIX: Role aur Email dikhaya */}
                <p style={{ fontSize: '0.8em', color: '#666', margin: 0 }}>
                    {userEmail} | **ROLE:** {userRole.toUpperCase()}
                </p>
            </div>

            {/* Right Side: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                
                {/* 🔔 Notification Bell */}
                <NotificationBell /> 
                
                {/* 🚪 Logout Button */}
                {currentUser && (
                    <button 
                        onClick={handleLogout} 
                        style={{ 
                            padding: '8px 15px', 
                            backgroundColor: '#dc3545', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Logout
                    </button>
                )}
            </div>
        </header>
    );
}

export default Header;