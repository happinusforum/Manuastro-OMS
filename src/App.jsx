// src/App.jsx

import React, { useState } from 'react'; // ⬅️ useState import kiya
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
import MyLeaveStatus from './pages/employee/MyLeaveStatus';

// Components
import AuthGuard from './components/auth/AuthGuard'; 
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import OfficeData from './components/common/OfficeData';
import LoadingSpinner from './components/common/LoadingSpinner';

function App() {
    const { loading, currentUser } = useAuth(); 
    
    // 🛠️ STATE LIFTING: Sidebar ka state ab yahan manage hoga
    // Default: Desktop (>768px) pe open, Mobile pe closed
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <LoadingSpinner message="Initializing OMS..." size="50px" />
            </div>
        ); 
    }

    return (
        // 🛠️ MAIN LAYOUT CONTAINER
        // h-screen & overflow-hidden: Prevent full page scroll
        <div className="flex h-screen overflow-hidden bg-gray-50">
            
            {/* 🌟 SIDEBAR (Fixed Position in its own file) */}
            {currentUser && (
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    toggleSidebar={toggleSidebar} 
                />
            )}

            {/* 🌟 RIGHT CONTENT CONTAINER 
               - Agar Sidebar Open hai: 'md:ml-64' (Jagah chodega)
               - Agar Sidebar Closed hai: 'md:ml-0' (Jagah nahi chodega, full width)
               transition-all -> Smooth resize agar future me sidebar toggle logic add kiya.
            */}
            <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 
                ${currentUser && isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}
            >
                
                {/* 🌟 HEADER (Sticky/Fixed handled inside Header component or here) */}
                {currentUser && <Header toggleSidebar={toggleSidebar} />}

                {/* 🌟 MAIN SCROLLABLE AREA 
                   flex-1 -> Baki bachi hui height le lega.
                   overflow-y-auto -> Sirf ye area scroll karega.
                */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 relative">
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={!currentUser ? <LoginPage /> : <Navigate to="/employee/dashboard" />} />
                        <Route path="/login" element={!currentUser ? <LoginPage /> : <Navigate to="/employee/dashboard" />} />

                        {/* 🔒 Protected Routes 🔒 */}
                        
                        {/* 1. Admin Routes */}
                        <Route path="/admin/dashboard" element={<AuthGuard allowedRoles={['admin']}><AdminDashboard /></AuthGuard>} />
                        <Route path="/admin/user-management" element={<AuthGuard allowedRoles={['admin']}><UserManagement /></AuthGuard>} />
                        <Route path="/office-data" element={<AuthGuard allowedRoles={['admin', 'hr', 'employee']}> <OfficeData /></AuthGuard>}/>
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
                        <Route path="/my-leaves" element={<AuthGuard allowedRoles={['employee']}><MyLeaveStatus /></AuthGuard>} />
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