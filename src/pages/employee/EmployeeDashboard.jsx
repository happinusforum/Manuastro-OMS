// src/pages/employee/EmployeeDashboard.jsx (FINAL CLEAN CODE - No Sidebar/Header)

import React, { useMemo } from 'react';
// ❌ Sidebar aur Header yahan se HATA diye gaye hain kyunki wo App.jsx mein hain
import { useAuth } from '../../context/AuthContext'; 
import { useFirestore } from '../../hooks/useFirestore'; // Ensure import case matches filename
import { formatDistanceToNow } from 'date-fns'; 
import LoadingSpinner from '../../components/common/LoadingSpinner'; 

function EmployeeDashboard() {
    const { currentUser, userProfile, loading: authLoading } = useAuth();
    const userId = currentUser ? currentUser.uid : null;

    const employeeProfile = userProfile;
    const profileLoading = authLoading || !employeeProfile; 
    
    // Tasks fetch logic remains same
    const { data: userTasks, loading: tasksLoading } = useFirestore(
        'tasks', 
        userId ? [['assignedToId', '==', userId]] : null
    );

    const employeeStats = useMemo(() => {
        if (profileLoading || tasksLoading || !userTasks || !employeeProfile) { 
            return {
                leaves: '...',
                pendingTasks: '...',
                totalProjects: '...',
                lastActivity: '...',
                upcomingTasks: [],
            };
        }

        const remainingLeaves = employeeProfile.remainingLeaves || 0; 
        const pendingTasksCount = userTasks.filter(t => t.status === 'Pending').length;
        const projectIds = userTasks.map(t => t.projectId).filter(Boolean);
        const totalProjectsCount = new Set(projectIds).size;
        
        const now = new Date();
        const upcomingTasksList = userTasks
            .filter(t => t.dueDate && new Date(t.dueDate) > now && t.status === 'Pending')
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5); 
            
        const lastActivityTime = new Date(now.getTime() - 60 * 60 * 1000); 
        const lastActivityFormatted = formatDistanceToNow(lastActivityTime, { addSuffix: true });

        return {
            leaves: remainingLeaves,
            pendingTasks: pendingTasksCount,
            totalProjects: totalProjectsCount,
            lastActivity: lastActivityFormatted,
            upcomingTasks: upcomingTasksList.map(t => ({
                title: t.title,
                dueDate: t.dueDate,
            })),
        };

    }, [employeeProfile, userTasks, tasksLoading, profileLoading]);


    // --- Render Logic (CLEANED - No Wrapper) ---
    return (
        <div className="p-5 bg-gray-50 flex-1 h-full overflow-y-auto"> {/* ⬅️ Sirf content wrapper */}
            
            {/* 💡 NEW PROFILE DISPLAY SECTION */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                    Welcome, {employeeProfile?.name || 'Employee User'}
                </h2>
                <p className="text-sm text-gray-600">
                    Email: {employeeProfile?.email} | Emp ID: <strong>{employeeProfile?.empId || 'N/A'}</strong> | Role: {employeeProfile?.role?.toUpperCase()}
                </p>
            </div>

            {/* 💡 Loading Spinner for Stats */}
            {(profileLoading || tasksLoading) && <LoadingSpinner message="Fetching user statistics..." size="40px" />}


            {/* Stats Cards */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-5">
                
                {/* Remaining Paid Leaves */}
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center">
                    <h3 className="m-0 text-2xl font-bold text-blue-600">
                        {profileLoading ? '...' : employeeStats.leaves}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">Remaining Paid Leaves</p>
                </div>

                {/* Pending Tasks */}
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center">
                    <h3 className="m-0 text-2xl font-bold text-blue-600">
                        {tasksLoading ? '...' : employeeStats.pendingTasks}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">Pending Tasks</p>
                </div>
                
                {/* Total Projects */}
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center">
                    <h3 className="m-0 text-2xl font-bold text-blue-600">
                        {tasksLoading ? '...' : employeeStats.totalProjects}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">Total Projects</p>
                </div>

                {/* Last Logged Activity */}
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center">
                    <h3 className="m-0 text-2xl font-bold text-blue-600">
                        {employeeStats.lastActivity}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">Last Logged Activity</p>
                </div>
            </div>

            {/* Upcoming Tasks Section */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold pb-2 border-b border-gray-200">Upcoming Tasks</h3>

                {tasksLoading && <p className="text-sm text-gray-500 mt-3">Fetching tasks...</p>}
                
                {!tasksLoading && employeeStats.upcomingTasks.length === 0 && (
                    <p className="text-sm text-gray-600 mt-3">No upcoming tasks, chill bro! 😎</p>
                )}
                
                {!tasksLoading && employeeStats.upcomingTasks.map((task, index) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded p-4 mt-3 shadow-sm">
                        <p className="text-sm text-gray-800">{task.title}</p>
                        <p className="text-sm text-red-600 font-semibold">Due: {task.dueDate}</p>
                    </div>
                ))}
                
                <button 
                    className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-md mt-4 hover:bg-blue-700"
                    onClick={() => console.log('Go to My Tasks clicked')}
                >
                    Go to My Tasks
                </button>
            </div>
        </div>
    );
}

export default EmployeeDashboard;