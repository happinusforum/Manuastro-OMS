// src/pages/employee/MyTasks.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { collection, query, where, getDocs } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 
import * as XLSX from 'xlsx'; 

// 🎨 Helper: Priority Badge (Modern Pill Style)
const PriorityBadge = ({ priority }) => {
    const styles = {
        High: 'bg-red-50 text-red-600 border-red-100',
        Medium: 'bg-orange-50 text-orange-600 border-orange-100',
        Low: 'bg-blue-50 text-blue-600 border-blue-100'
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${styles[priority] || 'bg-gray-100 text-gray-600'}`}>
            {priority}
        </span>
    );
};

function MyTasks() {
    const { currentUser, userProfile } = useAuth();
    const userId = currentUser?.uid;
    const userRole = userProfile?.role; 
    const isAdminOrHR = userRole === 'admin' || userRole === 'hr';

    // UI State
    const [viewMode, setViewMode] = useState('board'); 
    const [showMyTasksOnly, setShowMyTasksOnly] = useState(false); 
    const [selectedEmployeeForReport, setSelectedEmployeeForReport] = useState('');

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [currentTask, setCurrentTask] = useState({ 
        title: '', description: '', priority: 'Medium', dueDate: '', status: 'Pending',
        assignedToId: userId, assignedToName: userProfile?.name || 'Me' 
    });
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [employees, setEmployees] = useState([]);

    // 🔄 Fetch Employees (unchanged)
    useEffect(() => {
        if (isAdminOrHR) {
            const fetchEmployees = async () => {
                try {
                    const q = query(collection(db, "users"), where("role", "in", ["employee", "hr"]));
                    const snap = await getDocs(q);
                    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setEmployees(list);
                } catch (err) { console.error(err); }
            };
            fetchEmployees();
        }
    }, [isAdminOrHR]);

    // 🔍 FETCH TASKS (unchanged)
    const taskFilters = useMemo(() => {
        if (isAdminOrHR) return []; 
        return userId ? [['assignedToId', '==', userId]] : [];
    }, [userId, isAdminOrHR]);

    const { data: tasks, loading, error, addDocument, updateDocument, deleteDocument } = useFirestore('tasks', taskFilters);

    // 🔄 BOARD FILTER LOGIC (unchanged)
    const boardTasks = useMemo(() => {
        if (!tasks) return [];
        if (isAdminOrHR && showMyTasksOnly) {
            return tasks.filter(t => t.assignedToId === userId);
        }
        return tasks;
    }, [tasks, isAdminOrHR, showMyTasksOnly, userId]);

    // --- REPORT DATA LOGIC (unchanged) ---
    const reportData = useMemo(() => {
        if (!tasks) return [];
        let filtered = tasks;
        if (selectedEmployeeForReport) {
            filtered = tasks.filter(t => t.assignedToId === selectedEmployeeForReport);
        }
        return filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }, [tasks, selectedEmployeeForReport]);

    const handleDownloadReport = () => {
        if (reportData.length === 0) return alert("No data available to download!");
        const exportData = reportData.map(t => {
            let finalStatus = t.status;
            const isOverdue = t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date();
            if (isOverdue) finalStatus = 'Failed / Overdue';
            return {
                "Title": t.title, "Assigned To": t.assignedToName, "Priority": t.priority,
                "Status": finalStatus, "Due Date": t.dueDate || 'N/A',
                "Created Date": t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : '-',
                "Created By (UID)": t.createdBy || 'Unknown'
            };
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Task Report");
        XLSX.writeFile(wb, `Task_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- CRUD OPERATIONS (unchanged) ---
    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentTask.title) return alert("Title required!");

        let finalAssignedId = currentTask.assignedToId;
        let finalAssignedName = currentTask.assignedToName;

        if (isAdminOrHR && finalAssignedId !== userId) {
            const selectedEmp = employees.find(e => e.id === finalAssignedId);
            finalAssignedName = selectedEmp ? (selectedEmp.name || selectedEmp.email) : 'Unknown';
        } else if (!isAdminOrHR) {
            finalAssignedId = userId;
            finalAssignedName = userProfile?.name || 'Me';
        }

        const taskData = { ...currentTask, assignedToId: finalAssignedId, assignedToName: finalAssignedName, updatedAt: new Date() };

        try {
            if (editingId) await updateDocument(editingId, taskData);
            else await addDocument({ ...taskData, createdBy: userId, createdAt: new Date() });
            closeForm();
        } catch (err) { alert("Error: " + err.message); }
    };

    const handleDelete = async (id) => { 
        if (window.confirm("Are you sure you want to delete this task?")) {
            try { await deleteDocument(id); } 
            catch (err) { alert("Permission Denied: Only Admin or the task creator can delete this."); }
        }
    };

    const handleEdit = (task) => { setCurrentTask(task); setEditingId(task.id); setShowForm(true); setIsEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const handleStatusChange = async (task, newStatus) => { await updateDocument(task.id, { status: newStatus }); };
    
    const closeForm = () => {
        setShowForm(false); setIsEditing(false); setEditingId(null);
        setCurrentTask({ title: '', description: '', priority: 'Medium', dueDate: '', status: 'Pending', assignedToId: userId, assignedToName: userProfile?.name || 'Me' });
    };

    const pendingTasks = boardTasks.filter(t => t.status === 'Pending');
    const inProgressTasks = boardTasks.filter(t => t.status === 'In Progress');
    const completedTasks = boardTasks.filter(t => t.status === 'Completed');

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER & CONTROLS --- */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        {isAdminOrHR ? "Task Management Board" : "My Task Board"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {isAdminOrHR ? "Assign, track, and manage team productivity." : "Track your daily to-dos and project deadlines."}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* View Switcher */}
                    {isAdminOrHR && (
                        <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                            <button 
                                onClick={() => setViewMode('board')} 
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'board' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                📋 Kanban
                            </button>
                            <button 
                                onClick={() => setViewMode('report')} 
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'report' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                📊 Reports
                            </button>
                        </div>
                    )}

                    {/* Filter Toggle */}
                    {isAdminOrHR && viewMode === 'board' && (
                        <label className="flex items-center cursor-pointer select-none bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={showMyTasksOnly} onChange={() => setShowMyTasksOnly(!showMyTasksOnly)} />
                                <div className={`block w-8 h-5 rounded-full ${showMyTasksOnly ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition ${showMyTasksOnly ? 'transform translate-x-3' : ''}`}></div>
                            </div>
                            <div className="ml-2 text-xs font-bold text-gray-700">My Tasks Only</div>
                        </label>
                    )}

                    {/* Add Task Button */}
                    {viewMode === 'board' && (
                        <button 
                            onClick={() => setShowForm(!showForm)} 
                            className={`px-5 py-2 rounded-lg text-sm font-bold text-white shadow-md transition-all active:scale-95 flex items-center gap-2
                            ${showForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {showForm ? '✕ Close Form' : '+ New Task'}
                        </button>
                    )}
                </div>
            </div>

            {loading && <div className="py-10"><LoadingSpinner message="Syncing tasks..." /></div>}
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 border border-red-200">{error}</div>}

            {viewMode === 'board' && (
                <>
                    {/* --- CREATE / EDIT FORM --- */}
                    {showForm && (
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 animate-fade-in-down max-w-4xl mx-auto relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                {isEditing ? '✏️ Edit Task Details' : '✨ Create New Task'}
                            </h3>
                            
                            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Task Title</label>
                                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="What needs to be done?" required value={currentTask.title} onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })} />
                                </div>
                                
                                {isAdminOrHR && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign To</label>
                                        <select className="w-full px-4 py-2 border border-yellow-300 bg-yellow-50 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none cursor-pointer" value={currentTask.assignedToId} onChange={(e) => setCurrentTask({ ...currentTask, assignedToId: e.target.value })}>
                                            <option value={userId}>Myself</option>
                                            {employees.map(e => (<option key={e.id} value={e.id}>{e.name || e.email}</option>))}
                                        </select>
                                    </div>
                                )}
                                
                                <div className={isAdminOrHR ? "" : "md:col-span-2"}>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority Level</label>
                                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={currentTask.priority} onChange={(e) => setCurrentTask({ ...currentTask, priority: e.target.value })}>
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                    </select>
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                    <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" rows="3" placeholder="Add details..." value={currentTask.description} onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })}></textarea>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                                    <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={currentTask.dueDate} onChange={(e) => setCurrentTask({ ...currentTask, dueDate: e.target.value })} />
                                </div>
                                
                                <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={closeForm} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 transition-all active:scale-95">
                                        {isEditing ? 'Update Task' : 'Create Task'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* --- KANBAN BOARD --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start">
                        <TaskColumn title="To Do" tasks={pendingTasks} color="border-red-500" badgeColor="bg-red-100 text-red-700" onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} isAdminOrHR={isAdminOrHR} userRole={userRole} userId={userId} />
                        <TaskColumn title="In Progress" tasks={inProgressTasks} color="border-yellow-500" badgeColor="bg-yellow-100 text-yellow-700" onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} isAdminOrHR={isAdminOrHR} userRole={userRole} userId={userId} />
                        <TaskColumn title="Completed" tasks={completedTasks} color="border-green-500" badgeColor="bg-green-100 text-green-700" onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} isAdminOrHR={isAdminOrHR} userRole={userRole} userId={userId} />
                    </div>
                </>
            )}

            {/* --- REPORT VIEW --- */}
            {viewMode === 'report' && isAdminOrHR && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-end gap-4 bg-gray-50/50">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Filter by Employee</label>
                            <div className="relative">
                                <select className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none cursor-pointer" value={selectedEmployeeForReport} onChange={(e) => setSelectedEmployeeForReport(e.target.value)}>
                                    <option value="">All Employees</option>
                                    {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleDownloadReport} className="bg-green-600 text-white px-5 py-2 rounded-lg shadow hover:bg-green-700 transition-all flex items-center gap-2 font-medium">
                            <span className="text-lg">📥</span> Download Excel
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    {["Title", "Assigned To", "Priority", "Due Date", "Status", "Action"].map(h => (
                                        <th key={h} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reportData.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-gray-500 italic">No tasks found matching the criteria.</td></tr>
                                ) : (
                                    reportData.map(task => {
                                        const isOverdue = task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date();
                                        // Permission Logic for Delete in Table
                                        const showDelete = (userRole === 'admin') || (task.createdBy === userId && userRole !== 'hr');
                                        return (
                                            <tr key={task.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-800">{task.title}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                            {task.assignedToName?.charAt(0).toUpperCase()}
                                                        </div>
                                                        {task.assignedToName}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4"><PriorityBadge priority={task.priority} /></td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{task.dueDate || '-'}</td>
                                                <td className="px-6 py-4">
                                                    {task.status === 'Completed' 
                                                        ? <span className="text-green-700 font-bold bg-green-50 border border-green-200 px-2 py-1 rounded text-xs">Completed</span> 
                                                        : isOverdue 
                                                            ? <span className="text-red-700 font-bold bg-red-50 border border-red-200 px-2 py-1 rounded text-xs animate-pulse">⚠️ Overdue</span> 
                                                            : <span className="text-yellow-700 font-bold bg-yellow-50 border border-yellow-200 px-2 py-1 rounded text-xs">{task.status}</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4">
                                                    {showDelete && (
                                                        <button onClick={() => handleDelete(task.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50" title="Delete Task">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// 🧱 MODERN TASK COLUMN
const TaskColumn = ({ title, tasks, color, badgeColor, onStatusChange, onEdit, onDelete, isAdminOrHR, userRole, userId }) => (
    <div className="flex flex-col h-full bg-gray-100/50 rounded-xl border border-gray-200 overflow-hidden">
        {/* Column Header */}
        <div className={`p-4 border-t-4 ${color} bg-white border-b border-gray-100 flex justify-between items-center`}>
            <h4 className="font-bold text-gray-700">{title}</h4>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}>{tasks.length}</span>
        </div>
        
        {/* Scrollable Task Area */}
        <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[70vh] custom-scrollbar">
            {tasks.length === 0 && (
                <div className="text-center py-10 opacity-40">
                    <p className="text-2xl mb-2">🍃</p>
                    <p className="text-xs font-medium text-gray-500">No tasks here</p>
                </div>
            )}
            
            {tasks.map(task => {
                // 🔥 LOGIC PRESERVED 100%
                const showDeleteButton = (userRole === 'admin') || (task.createdBy === userId && userRole !== 'hr');
                const showEditButton = (task.createdBy === userId) || (userRole === 'admin');

                return (
                    <div key={task.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group relative">
                        
                        {/* Header: Title & Priority */}
                        <div className="flex justify-between items-start mb-3">
                            <h5 className="font-bold text-gray-800 text-sm leading-snug">{task.title}</h5>
                            <PriorityBadge priority={task.priority} />
                        </div>

                        {/* Assignee */}
                        {isAdminOrHR && (
                            <div className="flex items-center gap-1.5 mb-3">
                                <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold border border-indigo-100">
                                    {task.assignedToName?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-gray-500 truncate max-w-[120px]">{task.assignedToName}</span>
                            </div>
                        )}

                        {/* Date & Overdue Warning */}
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span>{task.dueDate || 'No Date'}</span>
                            {task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date() && (
                                <span className="text-red-500 font-bold flex items-center gap-1 bg-red-50 px-1.5 rounded">
                                    ! <span className="hidden sm:inline">Overdue</span>
                                </span>
                            )}
                        </div>

                        {/* Footer: Actions */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                            {/* Status Changer */}
                            <select 
                                className="text-xs py-1 pl-1 pr-6 border border-gray-200 rounded bg-gray-50 hover:bg-white focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer transition-colors"
                                value={task.status} 
                                onChange={(e) => onStatusChange(task, e.target.value)}
                            >
                                <option value="Pending">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                            </select>

                            {/* Buttons */}
                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                {showEditButton && (
                                    <button onClick={() => onEdit(task)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                )}
                                {showDeleteButton && (
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Delete">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

export default MyTasks;