// src/pages/admin/AdminDashboard.jsx (FINAL CODE - FIXING IMPORTS AND STATS)

import React, { useMemo } from 'react';

import { useAuth } from '../../context/AuthContext';// ⬅️ FIX: Hook name changed to lowercase 'useAuth'
import { useFirestore } from '../../hooks/useFirestore'; // ⬅️ FIX: Hook name changed to lowercase 'useFirestore'
import LoadingSpinner from '../../components/common/LoadingSpinner'; // ⬅️ ADD: Loading Spinner import kiya for better UX

function AdminDashboard() {
    const { currentUser } = useAuth();
    
    // 1. Users collection se data fetch karo
    const { data: users, loading: usersLoading } = useFirestore('users');
    
    // 2. Leaves collection se data fetch karo
    const { data: leaves, loading: leavesLoading } = useFirestore('leaves');

    // 💡 Real-time calculation using useMemo
    const adminStats = useMemo(() => {
        // ⬅️ ADD: Check for missing data (yehi woh check hai jo data ko real-time rakhta hai)
        if (usersLoading || leavesLoading || !users || !leaves) {
            return [
                { title: 'Total Employees', value: '...' },
                { title: 'Pending Leave Requests', value: '...' },
                { title: 'Total Admins', value: '...' }, // ⬅️ FIX: Title corrected
            ];
        }

        // ⬅️ NOTE: Counting all users as employees (including HR/Admin)
        const totalEmployees = users.length;
        const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
        const totalAdmins = users.filter(u => u.role === 'admin').length; // ⬅️ FIX: Calculation
        
        return [
            { title: 'Total Employees', value: totalEmployees },
            { title: 'Pending Leave Requests', value: pendingLeaves },
            { title: 'Total Admins', value: totalAdmins }, // ⬅️ FIX: Value and Title Finalized
        ];

    }, [users, leaves, usersLoading, leavesLoading]);


    return (
        <div className="flex min-h-screen">
            
            <div className="flex-1 flex flex-col">
                
                <main className="p-5 bg-gray-50 flex-1">
                    <h2 className="text-xl font-semibold pb-2 border-b border-gray-200">
                        Admin Dashboard Overview
                    </h2>

                    {/* 💡 Loading State Check */}
                    {(usersLoading || leavesLoading) && (
                        // ⬅️ FIX: Loading Spinner use kiya for better UX
                        <LoadingSpinner message="Fetching real-time data from Firestore..." size="40px" />
                    )}
                    
                    {/* Admin Dashboard Statistics (real data) */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {adminStats.map((stat, index) => (
                            <div 
                                key={index} 
                                className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center"
                            >
                                <h3 className="text-2xl font-bold text-blue-600">{stat.value}</h3> 
                                <p className="mt-2 text-sm text-gray-600">{stat.title}</p>
                            </div>
                        ))}
                    </div>
                    {/* ... rest of the content ... */}
                </main>
            </div>
        </div>
    );
}

export default AdminDashboard;