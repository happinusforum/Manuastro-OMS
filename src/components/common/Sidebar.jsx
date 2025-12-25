// src/components/common/Sidebar.jsx

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext'; 

// Sidebar Links (No Changes)
const navLinks = [
    { path: '/admin/dashboard', name: 'Admin Dashboard', roles: ['admin'] },
    { path: '/admin/user-management', name: 'User Control', roles: ['admin'] },
    { path: '/hr/dashboard', name: 'HR Dashboard', roles: ['hr', 'admin'] },
    { path: '/hr/leave-requests', name: 'Leave Approval', roles: ['hr', 'admin'] },
    { path: '/hr/attendance-records', name: 'Attendance Records', roles: ['hr', 'admin'] },
    { path: '/hr/payroll-management', name: 'Payroll Management', roles: ['hr', 'admin'] },
    { path: '/hr/leave-report', name: 'Leave Reports', roles: ['hr', 'admin'] },
    { path: '/hr/yearly-payoff', name: 'Yearly Payoff', roles: ['hr', 'admin'] },
    { path: '/office-data', name: 'Office Data / CMS', roles: ['admin', 'hr', 'employee'] },
    { path: '/shared-docs', name: 'Shared Documents', roles: ['admin', 'employee', 'hr'] },
    // --- EMPLOYEE SECTION ---
    { path: '/employee/dashboard', name: 'My Dashboard', roles: ['employee', 'hr', 'admin'] },
    { path: '/employee/my-tasks', name: 'My Tasks', roles: ['employee', 'admin', 'hr'] },
    { path: '/employee/leave-apply', name: 'Apply Leave/Query', roles: ['employee', 'admin'] },
    { path: '/my-leaves', name: 'My Leave Status', roles: ['employee', 'admin'] },
    { path: '/employee/profile', name: 'My Profile', roles: ['employee', 'hr', 'admin'] },
];

function Sidebar({ isOpen, toggleSidebar }) { 
    const { userProfile } = useAuth();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const currentRole = userProfile?.role?.toLowerCase(); 
    const filteredLinks = navLinks.filter(link => currentRole && link.roles.includes(currentRole));

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <>
            {/* ⚫ MOBILE BACKDROP (Click outside to close) */}
            {isMobile && isOpen && (
                <div 
                    onClick={toggleSidebar}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[35] transition-opacity"
                ></div>
            )}

            {/* 🔵 SIDEBAR CONTAINER */}
            <div 
                className={`
                    fixed left-0 bg-gray-900 text-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out w-64
                    
                    /* Hamesha Top se start hoga, full height */
                    top-0 h-screen
                    
                    /* Open/Close Logic */
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                `}
            >
                {/* --- SIDEBAR HEADER LOGO --- */}
                <div className="flex justify-between items-center px-6 h-16 border-b border-gray-800 shrink-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-wider text-blue-400">OMS 🚆</h2>
                    </div>
                    {/* Mobile Only Close Button inside Sidebar (Backup) */}
                    <button onClick={toggleSidebar} className="md:hidden text-gray-400 hover:text-white">
                        ✕
                    </button>
                </div>

                {/* --- USER ROLE BADGE --- */}
                <div className="px-6 py-4 bg-gray-800/30 shrink-0">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Current Role</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-semibold text-gray-200 capitalize">{currentRole || 'Guest'}</span>
                    </div>
                </div>

                {/* --- SCROLLABLE LINKS --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                    {filteredLinks.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center mt-10">Loading menu...</p>
                    ) : (
                        filteredLinks.map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                onClick={() => isMobile && toggleSidebar()} 
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                                    ${isActive 
                                        ? 'bg-blue-600/90 text-white shadow-lg translate-x-1' 
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white hover:pl-6'}
                                `}
                            >
                                {link.name}
                            </NavLink>
                        ))
                    )}
                </div>

                {/* --- FOOTER --- */}
                <div className="p-3 border-t border-gray-800 text-center bg-gray-900 shrink-0">
                    <p className="text-[10px] text-gray-600">© 2025 Manuastro</p>
                </div>
            </div>
        </>
    );
}

export default Sidebar;