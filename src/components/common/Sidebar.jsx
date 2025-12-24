// src/components/common/Sidebar.jsx (ADDED MY LEAVE STATUS LINK)

import React from 'react';
import { NavLink } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext'; 

// Sidebar Links Configuration
const navLinks = [
    { 
        path: '/admin/dashboard', 
        name: 'Admin Dashboard', 
        roles: ['admin'] 
    },
    { 
        path: '/admin/user-management', 
        name: 'User Control', 
        roles: ['admin'] 
    },
    { 
        path: '/hr/dashboard', 
        name: 'HR Dashboard', 
        roles: ['hr', 'admin'] 
    },
    { 
        path: '/hr/leave-requests', 
        name: 'Leave Approval', 
        roles: ['hr', 'admin'] 
    },
    { 
        path: '/hr/attendance-records', 
        name: 'Attendance Records', 
        roles: ['hr', 'admin'] 
    },
    { 
        path: '/hr/payroll-management', 
        name: 'Payroll Management', 
        roles: ['hr', 'admin'] 
    },
    { 
        path: '/hr/leave-report', 
        name: 'Leave Reports', 
        roles: ['hr', 'admin'] 
    },
    { 
        path: '/hr/yearly-payoff', 
        name: 'Yearly Payoff', 
        roles: ['hr', 'admin'] 
    },
   
    { 
        path: '/office-data', 
        name: 'Office Data / CMS', 
        roles: ['admin', 'hr', 'employee'] 
    },
    { 
        path: '/shared-docs', 
        name: 'Shared Documents', 
        roles: ['admin', 'employee', 'hr'] 
    },
    // --- EMPLOYEE SECTION ---
    { 
        path: '/employee/dashboard', 
        name: 'My Dashboard', 
        roles: ['employee', 'hr', 'admin'] 
    },
    { 
        path: '/employee/my-tasks', 
        name: 'My Tasks', 
        roles: ['employee', 'admin', 'hr'] 
    },
    { 
        path: '/employee/leave-apply', 
        name: 'Apply Leave/Query', 
        roles: ['employee', 'admin'] 
    },
    // 👇 NEW LINK ADDED HERE
    { 
        path: '/my-leaves', 
        name: 'My Leave Status', 
        roles: ['employee', 'admin'] 
    },
    { 
        path: '/employee/profile', 
        name: 'My Profile', 
        roles: ['employee', 'hr', 'admin'] 
    },
];

function Sidebar() {
    const { userProfile } = useAuth();

    // Role ko lowercase mein convert kiya
    const currentRole = userProfile?.role?.toLowerCase(); 

    const filteredLinks = navLinks.filter(link => 
        currentRole && link.roles.includes(currentRole)
    );

    return (
        <div style={{ 
            width: '250px', 
            backgroundColor: '#333', 
            color: 'white', 
            height: '100%',        // Parent ki height lega
            overflowY: 'auto',     // Scrollbar enable
            flexShrink: 0,         // Shrink hone se rokega
            padding: '20px', 
            display: 'flex', 
            flexDirection: 'column' 
        }}>
            <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px'}}>OMS 🚆</h2>
            
            <p style={{fontSize: '0.8rem', color: '#aaa', marginBottom: '20px'}}>
                Role: {currentRole?.toUpperCase() || 'LOADING...'}
            </p>
            
            <hr style={{ borderColor: '#555' }} />
            
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {filteredLinks.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: '0.9em' }}>
                        Fetching menu... 
                    </p>
                ) : (
                    filteredLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            style={({ isActive }) => ({
                                display: 'block',
                                padding: '10px 15px',
                                textDecoration: 'none',
                                color: isActive ? '#00FFFF' : 'white', 
                                backgroundColor: isActive ? '#555' : 'transparent',
                                borderRadius: '5px',
                                transition: '0.2s',
                                fontWeight: isActive ? 'bold' : 'normal'
                            })}
                        >
                            {link.name}
                        </NavLink>
                    ))
                )}
            </div>
            
            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #555', fontSize: '0.7em', color: '#777' }}>
                © 2025 Manuastro
            </div>
        </div>
    );
}

export default Sidebar;