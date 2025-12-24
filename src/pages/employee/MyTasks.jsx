// src/pages/employee/MyTasks.jsx (FINAL: EDIT RESTRICTED FOR ASSIGNED TASKS)

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { collection, query, where, getDocs } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 
import * as XLSX from 'xlsx'; 

// Helper: Priority Badge
const PriorityBadge = ({ priority }) => {
    const colors = {
        High: 'bg-red-100 text-red-800',
        Medium: 'bg-yellow-100 text-yellow-800',
        Low: 'bg-green-100 text-green-800'
    };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${colors[priority] || 'bg-gray-100'}`}>{priority}</span>;
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

    // 🔄 Fetch Employees (For Dropdowns)
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

    // 🔍 FETCH TASKS
    const taskFilters = useMemo(() => {
        if (isAdminOrHR) return []; 
        return userId ? [['assignedToId', '==', userId]] : [];
    }, [userId, isAdminOrHR]);

    const { data: tasks, loading, error, addDocument, updateDocument, deleteDocument } = useFirestore('tasks', taskFilters);

    // 🔄 BOARD FILTER LOGIC
    const boardTasks = useMemo(() => {
        if (!tasks) return [];
        if (isAdminOrHR && showMyTasksOnly) {
            return tasks.filter(t => t.assignedToId === userId);
        }
        return tasks;
    }, [tasks, isAdminOrHR, showMyTasksOnly, userId]);

    // --- REPORT DATA LOGIC ---
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

    // --- CRUD OPERATIONS ---
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

    // 🔥 PASSING USER INFO TO COLUMNS FOR PERMISSION LOGIC
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">{isAdminOrHR ? (showMyTasksOnly ? "My Personal Tasks" : "Team Tasks Board") : "My Tasks"}</h2>
                    <p className="text-gray-500">{isAdminOrHR ? "Manage Team & Personal Work" : "Manage your daily priorities"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {isAdminOrHR && viewMode === 'board' && (
                        <div className={`flex items-center px-3 py-2 rounded-lg border shadow-sm cursor-pointer transition ${showMyTasksOnly ? 'bg-blue-50 border-blue-300' : 'bg-white'}`} onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}>
                            <input type="checkbox" checked={showMyTasksOnly} onChange={() => {}} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
                            <span className="ml-2 text-sm font-semibold text-gray-700 select-none">Only My Tasks</span>
                        </div>
                    )}
                    {isAdminOrHR && (
                        <div className="bg-white p-1 rounded-lg shadow-sm border flex">
                            <button onClick={() => setViewMode('board')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${viewMode === 'board' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>📋 Board</button>
                            <button onClick={() => setViewMode('report')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${viewMode === 'report' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>📊 Reports</button>
                        </div>
                    )}
                    {viewMode === 'board' && (
                        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition">{showForm ? 'Close' : '+ Task'}</button>
                    )}
                </div>
            </div>

            {loading && <LoadingSpinner message="Loading tasks..." />}
            {error && <p className="text-red-500 mb-4">{error}</p>}

            {viewMode === 'board' && (
                <>
                    {showForm && (
                        <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100 mb-8 animate-fade-in-down">
                            <h3 className="text-xl font-bold mb-4 text-gray-700">{isEditing ? 'Edit Task' : 'Create New Task'}</h3>
                            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2"><label className="text-sm font-semibold">Task Title</label><input type="text" className="w-full p-2 border rounded" required value={currentTask.title} onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })} /></div>
                                {isAdminOrHR && (<div className="col-span-2 md:col-span-1"><label className="text-sm font-semibold">Assign To</label><select className="w-full p-2 border rounded bg-yellow-50" value={currentTask.assignedToId} onChange={(e) => setCurrentTask({ ...currentTask, assignedToId: e.target.value })}><option value={userId}>Myself</option>{employees.map(e => (<option key={e.id} value={e.id}>{e.name || e.email}</option>))}</select></div>)}
                                <div className={isAdminOrHR ? "col-span-2 md:col-span-1" : "col-span-2"}><label className="text-sm font-semibold">Priority</label><select className="w-full p-2 border rounded" value={currentTask.priority} onChange={(e) => setCurrentTask({ ...currentTask, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></div>
                                <div className="col-span-2"><label className="text-sm font-semibold">Description</label><textarea className="w-full p-2 border rounded" rows="3" value={currentTask.description} onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })}></textarea></div>
                                <div><label className="text-sm font-semibold">Due Date</label><input type="date" className="w-full p-2 border rounded" value={currentTask.dueDate} onChange={(e) => setCurrentTask({ ...currentTask, dueDate: e.target.value })} /></div>
                                <div className="col-span-2 flex justify-end gap-3 mt-4"><button type="button" onClick={closeForm} className="px-6 py-2 bg-gray-200 rounded">Cancel</button><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded shadow">{isEditing ? 'Update' : 'Assign'}</button></div>
                            </form>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <TaskColumn title="To Do" tasks={pendingTasks} color="border-red-400" onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} isAdminOrHR={isAdminOrHR} userRole={userRole} userId={userId} />
                        <TaskColumn title="In Progress" tasks={inProgressTasks} color="border-yellow-400" onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} isAdminOrHR={isAdminOrHR} userRole={userRole} userId={userId} />
                        <TaskColumn title="Completed" tasks={completedTasks} color="border-green-400" onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} isAdminOrHR={isAdminOrHR} userRole={userRole} userId={userId} />
                    </div>
                </>
            )}

            {viewMode === 'report' && isAdminOrHR && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Filter by Employee</label>
                            <select className="p-2 border rounded w-64 focus:ring-2 focus:ring-indigo-500" value={selectedEmployeeForReport} onChange={(e) => setSelectedEmployeeForReport(e.target.value)}>
                                <option value="">All Employees</option>
                                {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>))}
                            </select>
                        </div>
                        <button onClick={handleDownloadReport} className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2">📊 Download Excel Report</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 border-b"><tr><th className="p-3">Title</th><th className="p-3">Assigned To</th><th className="p-3">Priority</th><th className="p-3">Due Date</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
                            <tbody>
                                {reportData.length === 0 ? (<tr><td colSpan="6" className="p-6 text-center text-gray-500">No tasks found.</td></tr>) : (
                                    reportData.map(task => {
                                        const isOverdue = task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date();
                                        // 🔥 Logic for Report Table Delete Button
                                        const showDelete = (userRole === 'admin') || (task.createdBy === userId && userRole !== 'hr');
                                        return (
                                            <tr key={task.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium">{task.title}</td>
                                                <td className="p-3 text-sm">👤 {task.assignedToName}</td>
                                                <td className="p-3"><PriorityBadge priority={task.priority} /></td>
                                                <td className="p-3 text-sm">{task.dueDate || '-'}</td>
                                                <td className="p-3">
                                                    {task.status === 'Completed' ? <span className="text-green-700 font-bold bg-green-100 px-2 py-1 rounded text-xs">Completed</span> : isOverdue ? <span className="text-red-700 font-bold bg-red-100 px-2 py-1 rounded text-xs">⚠️ Overdue</span> : <span className="text-yellow-700 font-bold bg-yellow-100 px-2 py-1 rounded text-xs">{task.status}</span>}
                                                </td>
                                                <td className="p-3">
                                                    {showDelete && <button onClick={() => handleDelete(task.id)} className="text-red-500 hover:text-red-700">🗑️</button>}
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

// 🧱 UPDATED TASK COLUMN WITH PERMISSION LOGIC
const TaskColumn = ({ title, tasks, color, onStatusChange, onEdit, onDelete, isAdminOrHR, userRole, userId }) => (
    <div className="bg-white rounded-xl shadow-sm p-4 h-full flex flex-col border border-gray-100">
        <h4 className={`font-bold text-lg mb-4 pl-3 border-l-4 ${color} text-gray-700`}>{title} ({tasks.length})</h4>
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
            {tasks.map(task => {
                // 🔥 LOGIC: KAUN DELETE KAR SAKTA HAI?
                // 1. Admin: YES
                // 2. HR: NO
                // 3. Employee: YES (Only Self Created)
                const showDeleteButton = (userRole === 'admin') || (task.createdBy === userId && userRole !== 'hr');

                // 🔥 LOGIC: KAUN EDIT KAR SAKTA HAI?
                // 1. Creator (Employee/Admin/HR jisne banaya)
                // 2. Admin (Hamesha)
                // 3. AGAR assign hua hai kisi aur ne kiya hai -> EDIT NOT ALLOWED
                const showEditButton = (task.createdBy === userId) || (userRole === 'admin');

                return (
                    <div key={task.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-md transition group">
                        <div className="flex justify-between items-start mb-2"><h5 className="font-bold text-gray-800 text-sm">{task.title}</h5><PriorityBadge priority={task.priority} /></div>
                        {isAdminOrHR && <p className="text-xs font-semibold text-indigo-600 mb-2">👤 {task.assignedToName}</p>}
                        <div className="flex justify-between items-center text-xs text-gray-500 mt-2 border-t pt-2"><span>📅 {task.dueDate || 'No Date'}</span>{task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date() && <span className="text-red-600 font-bold animate-pulse">⚠️ Overdue</span>}</div>
                        <div className="mt-2 pt-2 flex justify-between items-center">
                            <select className="text-xs p-1 border rounded bg-white cursor-pointer" value={task.status} onChange={(e) => onStatusChange(task, e.target.value)}><option value="Pending">To Do</option><option value="In Progress">Working</option><option value="Completed">Done</option></select>
                            <div className="flex gap-2">
                                {/* Only Show Edit if Creator or Admin */}
                                {showEditButton && <button onClick={() => onEdit(task)} className="text-blue-500 p-1">✏️</button>}
                                {/* Only Show Delete if Allowed */}
                                {showDeleteButton && <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-red-500 p-1">🗑️</button>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

export default MyTasks;