// src/components/common/Header.jsx

import React from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { logoutUser } from '../../api/AuthService'; 
import NotificationBell from '../ui/NotificationBell'; 
import { useNavigate } from 'react-router-dom';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

function Header({ toggleSidebar }) { // 🛠️ Accept toggleSidebar prop
    const { currentUser, userProfile, loading } = useAuth();
    const navigate = useNavigate();

    // Data Extraction
    const fullName = userProfile?.name || currentUser?.email.split('@')[0] || 'Guest';
    const userRole = userProfile?.role || 'guest';
    const userEmail = currentUser?.email || 'N/A';
    const userPhoto = userProfile?.photoURL || DEFAULT_AVATAR;

    const handleLogout = async () => {
        try {
            await logoutUser(); 
            navigate('/login'); 
        } catch (error) { console.error("Logout Error:", error); }
    };

    if (loading) return null; 

    return (
        <header className="bg-white shadow-md px-4 py-3 sticky top-0 z-30 flex justify-between items-center h-16 shrink-0">
            
            {/* Left Side: Toggle Button + Welcome Text */}
            <div className="flex items-center gap-4">
                
                {/* 🟢 SIDEBAR TOGGLE BUTTON (Visible mostly on Mobile/Tablet) */}
                <button 
                    onClick={toggleSidebar}
                    className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors focus:outline-none"
                    title="Toggle Sidebar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                </button>

                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-gray-800 tracking-tight flex items-center gap-2">
                        <span className="hidden sm:inline">Welcome,</span> 
                        <span className="text-blue-600 truncate max-w-[120px] sm:max-w-none">{fullName.split(' ')[0]}</span>
                    </h1>
                    
                    {/* Role Badge */}
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-semibold uppercase tracking-wider text-[10px]">
                            {userRole}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="truncate max-w-[150px]">{userEmail}</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-3 sm:gap-6">
                
                {/* 🔔 Notification Bell */}
                <div className="relative hover:bg-gray-50 p-2 rounded-full transition cursor-pointer">
                    <NotificationBell />
                </div>
                
                {/* 👤 Profile & Logout Section */}
                {currentUser && (
                    <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                        
                        {/* Profile Image */}
                        <div 
                            onClick={() => navigate('/employee/profile')}
                            className="relative group cursor-pointer"
                            title="My Profile"
                        >
                            <img 
                                src={userPhoto} 
                                alt="User" 
                                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm group-hover:ring-2 ring-blue-100 transition"
                            />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                        </div>

                        {/* Logout Button */}
                        <button 
                            onClick={handleLogout} 
                            className="hidden sm:flex bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition items-center gap-2 font-semibold text-xs border border-red-100"
                            title="Logout"
                        >
                            <span>Logout</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;