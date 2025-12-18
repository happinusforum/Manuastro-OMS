// src/pages/hr/HRDashboard.jsx (FINAL CODE - REAL-TIME DATA)

import React, { useMemo } from 'react';

import { useAuth } from '../../context/AuthContext'; // ⬅️ FIX: Hook name fixed
import { useFirestore } from '../../hooks/useFirestore'; // ⬅️ IMPORT: Firestore hook un-commented
import LoadingSpinner from '../../components/common/LoadingSpinner'; // ⬅️ ADD: Loading Spinner for UX
import { Link } from 'react-router-dom'; // ⬅️ ADD: Link for Quick Actions

// Simple internal style for buttons (Tailwind classes preferred, but sticking to inline for consistency)
const buttonStyle = {
    padding: '10px 15px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    textDecoration: 'none', // For Link component
    textAlign: 'center'
};

function HRDashboard() {
    const { currentUser } = useAuth();
    
    // 1. Users collection se data fetch karo
    const { data: users, loading: usersLoading } = useFirestore('users');
    
    // 2. Leaves collection se data fetch karo
    const { data: leaves, loading: leavesLoading } = useFirestore('leaves');

    // 3. Attendance collection se data fetch karo (Attendance Today % ke liye)
    const { data: attendance, loading: attendanceLoading } = useFirestore('attendance');


    // 💡 Real-time calculation using useMemo
    const hrStats = useMemo(() => {
        // Loading state check
        if (usersLoading || leavesLoading || attendanceLoading || !users || !leaves || !attendance) {
            return [
                { title: 'Pending Leave Requests', value: '...' },
                { title: 'Total Employees (Active)', value: '...' },
                { title: 'Attendance Today (%)', value: '...' },
                { title: 'Upcoming Payroll Date', value: '7 JAn' }, // Ye hardcoded hi rahega for now
            ];
        }

        // --- Data Extraction and Calculation ---
        const activeEmployees = users.filter(u => u.role !== 'admin').length;
        const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
        
        // Attendance Today Logic (Simple calculation)
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = attendance.filter(a => a.date === today);

        let attendancePercentage = 'N/A';
        if (todayRecords.length > 0) {
            const presentCount = todayRecords.filter(a => a.status === 'Present').length;
            // Total Active Employees (excluding Admin) ko base maan liya
            attendancePercentage = ((presentCount / activeEmployees) * 100).toFixed(0) + '%';
        } else {
             attendancePercentage = 'No Data';
        }


        return [
            { title: 'Pending Leave Requests', value: pendingLeaves },
            { title: 'Total Employees (Active)', value: activeEmployees },
            { title: 'Attendance Today (%)', value: attendancePercentage },
            { title: 'Upcoming Payroll Date', value: 'Dec 25' }, // Hardcoded
        ];

    }, [users, leaves, attendance, usersLoading, leavesLoading, attendanceLoading]);

    // Check if any data is still loading
    const overallLoading = usersLoading || leavesLoading || attendanceLoading;

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            
      

            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                

                <main style={{ padding: '20px', backgroundColor: '#f4f7f9', flexGrow: 1 }}>
                    <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', color: '#007bff' }}>
                        HR Management Dashboard
                    </h2>
                    
                    {/* 💡 Loading State Check */}
                    {overallLoading && (
                        <LoadingSpinner message="Fetching all HR data..." size="40px" />
                    )}

                    {/* HR Statistics Cards */}
                    {!overallLoading && (
                        <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
                            {hrStats.map((stat, index) => (
                                <div 
                                    key={index} 
                                    style={{ 
                                        padding: '20px', 
                                        backgroundColor: 'white', 
                                        borderRadius: '8px', 
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                        flex: '1 1 220px',
                                        minWidth: '200px'
                                    }}
                                >
                                    <h3 style={{ margin: 0, color: '#28a745' }}>{stat.value}</h3>
                                    <p style={{ margin: '5px 0 0', color: '#555' }}>{stat.title}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Quick Access Section */}
                    <div style={{ marginTop: '40px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <h3>Quick Actions</h3>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            {/* Review Leave Requests */}
                            <Link to="/hr/leave-requests" style={buttonStyle}>Review Leave Requests</Link>
                            
                            {/* Manage Attendance */}
                            <Link to="/hr/attendance-records" style={buttonStyle}>Manage Attendance</Link>
                            
                            {/* View Payroll */}
                            <Link to="/hr/payroll-management" style={buttonStyle}>View Payroll</Link>
                        </div>
                    </div>

                    <p style={{ marginTop: '30px', color: '#888', fontSize: '0.9em' }}>
                        Logged in as HR: {currentUser?.email}
                    </p>
                </main>
            </div>
        </div>
    );
}

export default HRDashboard;