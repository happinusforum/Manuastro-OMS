// src/pages/admin/AdminDashboard.jsx

import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// 
// Logic wahi hai, bas Icons aur Colors add kiye hain presentation ke liye
function AdminDashboard() {
    const { currentUser } = useAuth();
    
    // 1. Data Fetching (Logic Unchanged)
    const { data: users, loading: usersLoading } = useFirestore('users');
    const { data: leaves, loading: leavesLoading } = useFirestore('leaves');

    // 💡 Real-time calculation using useMemo (Logic Unchanged)
    const adminStats = useMemo(() => {
        // Loading Check
        if (usersLoading || leavesLoading || !users || !leaves) {
            return [
                { title: 'Total Employees', value: '...', icon: 'users', color: 'blue' },
                { title: 'Pending Leave Requests', value: '...', icon: 'clock', color: 'yellow' },
                { title: 'Total Admins', value: '...', icon: 'shield', color: 'purple' },
            ];
        }

        // Calculations
        const totalEmployees = users.length;
        const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
        const totalAdmins = users.filter(u => u.role === 'admin').length;
        
        return [
            { 
                title: 'Total Employees', 
                value: totalEmployees, 
                icon: 'users', 
                color: 'blue' // UI ke liye color add kiya
            },
            { 
                title: 'Pending Leave Requests', 
                value: pendingLeaves, 
                icon: 'clock', 
                color: 'yellow' 
            },
            { 
                title: 'Total Admins', 
                value: totalAdmins, 
                icon: 'shield', 
                color: 'purple' 
            },
        ];

    }, [users, leaves, usersLoading, leavesLoading]);

    // --- Helper to render Icons based on string ---
    const renderIcon = (type) => {
        switch(type) {
            case 'users': return (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            );
            case 'clock': return (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
            case 'shield': return (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER SECTION --- */}
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Welcome back, <span className="font-semibold text-blue-600">{currentUser?.email}</span>
                </p>
            </header>

            {/* --- LOADING STATE --- */}
            {(usersLoading || leavesLoading) ? (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner message="Syncing Dashboard Data..." size="40px" />
                </div>
            ) : (
                /* --- MAIN CONTENT GRID --- */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {adminStats.map((stat, index) => (
                        <div 
                            key={index} 
                            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-transform hover:-translate-y-1 duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
                                    <h3 className="text-3xl font-bold text-gray-800">{stat.value}</h3>
                                </div>
                                
                                {/* Dynamic Icon Background Color */}
                                <div className={`p-3 rounded-full 
                                    ${stat.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                                    ${stat.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' : ''}
                                    ${stat.color === 'purple' ? 'bg-purple-100 text-purple-600' : ''}
                                `}>
                                    {renderIcon(stat.icon)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- PLACEHOLDER FOR FUTURE CONTENT (Quick Actions) --- */}
            {!usersLoading && !leavesLoading && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <button className="p-4 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium">
                            + Add New Employee
                        </button>
                        <button className="p-4 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 transition-colors text-sm font-medium">
                            Review Leave Requests
                        </button>
                        <button className="p-4 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 transition-colors text-sm font-medium">
                            Generate Payroll Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;