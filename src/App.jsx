// src/App.jsx (FINAL LAYOUT FIX - Fixed Sidebar, Scrollable Content)

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/authen/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import HRDashboard from './pages/hr/HRDashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import UserManagement from './pages/admin/UserManagement';
import PayrollManagement from './pages/hr/PayrollManagement';
import LeaveRequest from './pages/hr/LeaveRequest'; 
import MyTasks from './pages/employee/MyTasks';
import LeaveApply from './pages/employee/LeaveApply';
import AttendanceRecord from './pages/hr/AttendanceRecord'; 
import Profile from './pages/employee/Profile';
import Notfound from './pages/shared/Notfound';
import MonthlyAttendanceReport from './pages/hr/MonthlyAttendanceReport';
import MonthlyLeaveReport from './pages/hr/MonthlyLeaveReport';
import YearlyPayoffReport from './pages/hr/YearlyPayoffReport';
import SharedDocs from './components/common/SharedDocs';
// Components
import AuthGuard from './components/auth/AuthGuard'; 
// ⬅️ NEW IMPORTS: Global Components yahan import karo
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import OfficeData from './components/common/OfficeData';

function App() {
    const { loading, currentUser } = useAuth(); 

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>Loading Application...</div>; 
    }

    return (
        // 🛠️ FIX 1: 'minHeight' hata kar 'height: 100vh' aur 'overflow: hidden'
        // Isse poora page screen size pe lock ho jayega
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            
            {/* 🌟 PERSISTENT SIDEBAR */}
            {currentUser && <Sidebar />}

            {/* Right Side Container (Header + Content) */}
            {/* 🛠️ FIX 2: 'height: 100%' aur 'overflow: hidden' add kiya */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                
                {/* 🌟 PERSISTENT HEADER */}
                {currentUser && <Header />}

                {/* Main Content Area */}
                {/* 🛠️ FIX 3: 'overflowY: auto' aur 'height: 100%' 
                   Isse sirf ye safed wala hissa scroll karega, sidebar nahi hilega */}
                <main style={{ 
                    padding: '20px', 
                    backgroundColor: '#f4f7f9', 
                    flexGrow: 1, 
                    overflowY: 'auto', 
                    height: '100%' 
                }}>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={!currentUser ? <LoginPage /> : <Navigate to="/employee/dashboard" />} />
                        <Route path="/login" element={!currentUser ? <LoginPage /> : <Navigate to="/employee/dashboard" />} />

                        {/* 🔒 Protected Routes 🔒 */}
                        
                        {/* 1. Admin Routes */}
                        <Route path="/admin/dashboard" element={<AuthGuard allowedRoles={['admin']}><AdminDashboard /></AuthGuard>} />
                        <Route path="/admin/user-management" element={<AuthGuard allowedRoles={['admin']}><UserManagement /></AuthGuard>} />
                        <Route path="/office-data" element={<AuthGuard allowedRoles={['admin', 'hr', 'employee']}> <OfficeData /></AuthGuard>}/>
                        // Protected Route ke andar:
<Route path="/shared-docs" element={<AuthGuard allowedRoles={['admin', 'employee', 'hr']}><SharedDocs /></AuthGuard>} />
                        
                        {/* 2. HR Routes */}
                        <Route path="/hr/yearly-payoff" element={<AuthGuard allowedRoles={['hr', 'admin']}><YearlyPayoffReport /></AuthGuard>} />
                        <Route path="/hr/leave-report" element={<AuthGuard allowedRoles={['hr', 'admin']}><MonthlyLeaveReport /></AuthGuard>} />
                        <Route path="/hr/monthly-report" element={<AuthGuard allowedRoles={['hr', 'admin']}><MonthlyAttendanceReport /></AuthGuard>} />
                        <Route path="/hr/dashboard" element={<AuthGuard allowedRoles={['hr', 'admin']}><HRDashboard /></AuthGuard>} />
                        <Route path="/hr/payroll-management" element={<AuthGuard allowedRoles={['hr', 'admin']}><PayrollManagement /></AuthGuard>} />
                        <Route path="/hr/leave-requests" element={<AuthGuard allowedRoles={['hr', 'admin']}><LeaveRequest /></AuthGuard>} />
                        <Route path="/hr/attendance-records" element={<AuthGuard allowedRoles={['hr', 'admin']}><AttendanceRecord /></AuthGuard>} />

                        {/* 3. Employee Routes */}
                        <Route path="/employee/dashboard" element={<AuthGuard allowedRoles={['employee', 'hr', 'admin']}><EmployeeDashboard /></AuthGuard>} />
                        <Route path="/employee/my-tasks" element={<AuthGuard allowedRoles={['employee', 'admin']}><MyTasks /></AuthGuard>} />
                        <Route path="/employee/leave-apply" element={<AuthGuard allowedRoles={['employee', 'admin']}><LeaveApply /></AuthGuard>} /> 
                        <Route path="/employee/profile" element={<AuthGuard allowedRoles={['employee', 'hr', 'admin']}><Profile /></AuthGuard>} /> 
                        
                        {/* 4. Not Found */}
                        <Route path="*" element={<Notfound/>} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default App;