// src/pages/employee/EmployeeDashboard.jsx

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // ⬅️ UX: Navigation ke liye add kiya
import { useAuth } from '../../context/AuthContext'; 
import { useFirestore } from '../../hooks/useFirestore'; 
import { formatDistanceToNow } from 'date-fns'; 
import LoadingSpinner from '../../components/common/LoadingSpinner'; 

function EmployeeDashboard() {
    const { currentUser, userProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate(); // For button click
    const userId = currentUser ? currentUser.uid : null;

    const employeeProfile = userProfile;
    const profileLoading = authLoading || !employeeProfile; 
    
    // Tasks fetch logic (UNCHANGED)
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

    // --- HELPER: Icons for Cards ---
    const getIcon = (type) => {
        switch(type) {
            case 'leaves': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
            case 'tasks': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'projects': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
            case 'activity': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER SECTION --- */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">My Dashboard</h1>
                <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 mt-1 gap-2 sm:gap-4">
                    <span>Welcome back, <span className="font-semibold text-blue-600">{employeeProfile?.name || 'User'}</span></span>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">ID: {employeeProfile?.empId || 'N/A'}</span>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <span className="uppercase text-xs font-bold tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                        {employeeProfile?.role || 'Employee'}
                    </span>
                </div>
            </div>

            {/* --- LOADING STATE --- */}
            {(profileLoading || tasksLoading) ? (
                <div className="flex justify-center items-center h-48">
                    <LoadingSpinner message="Syncing your data..." size="40px" />
                </div>
            ) : (
                <>
                    {/* --- STATS CARDS --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        
                        {/* 1. Leaves */}
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Leave Balance</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{employeeStats.leaves}</h3>
                                </div>
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    {getIcon('leaves')}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">Paid leaves remaining</p>
                        </div>

                        {/* 2. Pending Tasks */}
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Tasks</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{employeeStats.pendingTasks}</h3>
                                </div>
                                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                    {getIcon('tasks')}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">Need attention</p>
                        </div>

                        {/* 3. Projects */}
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Projects</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{employeeStats.totalProjects}</h3>
                                </div>
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    {getIcon('projects')}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">Assigned to you</p>
                        </div>

                        {/* 4. Activity */}
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Last Activity</p>
                                    <h3 className="text-lg font-bold text-gray-800 mt-1 leading-tight">{employeeStats.lastActivity}</h3>
                                </div>
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    {getIcon('activity')}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">System Interaction</p>
                        </div>
                    </div>

                    {/* --- UPCOMING TASKS SECTION --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Task List */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-gray-700">Upcoming Deadlines</h3>
                                <button 
                                    onClick={() => navigate('/employee/my-tasks')}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    View All Tasks →
                                </button>
                            </div>

                            <div className="p-6">
                                {employeeStats.upcomingTasks.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="inline-block p-4 rounded-full bg-green-50 mb-3">
                                            <span className="text-3xl">😎</span>
                                        </div>
                                        <p className="text-gray-800 font-medium">All caught up!</p>
                                        <p className="text-sm text-gray-500">No upcoming deadlines found.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {employeeStats.upcomingTasks.map((task, index) => (
                                            <div key={index} className="flex items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group">
                                                {/* Calendar Icon Box */}
                                                <div className="hidden sm:flex flex-col items-center justify-center w-12 h-12 bg-red-50 text-red-600 rounded-lg mr-4 group-hover:bg-red-100 transition-colors">
                                                    <span className="text-xs font-bold uppercase">{new Date(task.dueDate).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-lg font-bold leading-none">{new Date(task.dueDate).getDate()}</span>
                                                </div>
                                                
                                                {/* Task Details */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800 truncate">{task.title}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Due: {task.dueDate}
                                                    </p>
                                                </div>

                                                {/* Mobile Date Badge (Alternative to left box) */}
                                                <div className="sm:hidden text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                                    {new Date(task.dueDate).getDate()} {new Date(task.dueDate).toLocaleString('default', { month: 'short' })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side Widget (Optional - can be Announcements or Quick Actions) */}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg text-white p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-bold mb-2">Need a Break? 🌴</h3>
                                <p className="text-blue-100 text-sm mb-6">
                                    You have <strong>{employeeStats.leaves} days</strong> of paid leave remaining. Plan your vacation ahead!
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate('/employee/leave-apply')}
                                className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Apply Leave
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default EmployeeDashboard;