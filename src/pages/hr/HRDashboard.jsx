// src/pages/hr/HRDashboard.jsx

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function HRDashboard() {
    const { currentUser } = useAuth();
    
    // 1. Data Fetching (UNCHANGED)
    const { data: users, loading: usersLoading } = useFirestore('users');
    const { data: leaves, loading: leavesLoading } = useFirestore('leaves');
    const { data: attendance, loading: attendanceLoading } = useFirestore('attendance');

    // 💡 Real-time calculation using useMemo (UNCHANGED)
    const hrStats = useMemo(() => {
        if (usersLoading || leavesLoading || attendanceLoading || !users || !leaves || !attendance) {
            return [
                { title: 'Pending Leaves', value: '...', icon: 'clock', color: 'orange' },
                { title: 'Active Employees', value: '...', icon: 'users', color: 'blue' },
                { title: 'Attendance Today', value: '...', icon: 'check', color: 'green' },
                { title: 'Next Payroll', value: '7 Jan', icon: 'wallet', color: 'pink' },
            ];
        }

        const activeEmployees = users.filter(u => u.role !== 'admin').length;
        const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
        
        // Attendance Logic
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = attendance.filter(a => a.date === today);

        let attendancePercentage = 'N/A';
        if (todayRecords.length > 0) {
            const presentCount = todayRecords.filter(a => a.status === 'Present').length;
            attendancePercentage = ((presentCount / activeEmployees) * 100).toFixed(0) + '%';
        } else {
             attendancePercentage = '0%';
        }

        return [
            { 
                title: 'Pending Leaves', 
                value: pendingLeaves, 
                icon: 'clock', 
                color: 'orange' 
            },
            { 
                title: 'Active Employees', 
                value: activeEmployees, 
                icon: 'users', 
                color: 'blue' 
            },
            { 
                title: 'Attendance Today', 
                value: attendancePercentage, 
                icon: 'check', 
                color: 'green' 
            },
            { 
                title: 'Next Payroll', 
                value: '7 Jan', 
                icon: 'wallet', 
                color: 'pink' 
            },
        ];

    }, [users, leaves, attendance, usersLoading, leavesLoading, attendanceLoading]);

    // Check loading
    const overallLoading = usersLoading || leavesLoading || attendanceLoading;

    // Helper for Icons
    const getIcon = (type) => {
        switch(type) {
            case 'clock': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'users': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
            case 'check': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'wallet': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER --- */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">HR Overview</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <span>Welcome back,</span>
                    <span className="font-semibold text-blue-600">{currentUser?.email}</span>
                </div>
            </div>

            {/* --- LOADING STATE --- */}
            {overallLoading ? (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner message="Syncing HR Data..." size="40px" />
                </div>
            ) : (
                <>
                    {/* --- STATS GRID --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {hrStats.map((stat, index) => (
                            <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.title}</p>
                                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</h3>
                                    </div>
                                    <div className={`p-3 rounded-lg bg-${stat.color}-50 text-${stat.color}-600`}>
                                        {getIcon(stat.icon)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* --- QUICK ACTIONS SECTION --- */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3">Quick Actions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Action 1: Leave Requests */}
                            <Link to="/hr/leave-requests" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-1">Review Leaves</h4>
                                <p className="text-sm text-gray-500">Approve or reject pending employee leave applications.</p>
                            </Link>

                            {/* Action 2: Attendance */}
                            <Link to="/hr/attendance-records" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all">
                                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-1">Mark Attendance</h4>
                                <p className="text-sm text-gray-500">Update daily attendance records and check status.</p>
                            </Link>

                            {/* Action 3: Payroll */}
                            <Link to="/hr/payroll-management" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-green-400 hover:shadow-md transition-all">
                                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-1">Payroll Management</h4>
                                <p className="text-sm text-gray-500">View salary details and generate monthly payslips.</p>
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default HRDashboard;