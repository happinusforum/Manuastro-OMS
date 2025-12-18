// src/pages/employee/MyTasks.jsx (FINAL CODE - Fixing Firestore Crash and Filtering)

import React, { useState } from 'react';

import { useAuth } from '../../context/AuthContext';
// ⬅️ FIX 1: Hook name ko camelCase mein badla
import { useFirestore } from '../../hooks/useFirestore'; 
import LoadingSpinner from '../../components/common/LoadingSpinner'; // ⬅️ UX fix

function MyTasks() {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [message, setMessage] = useState('');
    const [loadingForm, setLoadingForm] = useState(false);

    // 💡 useAuth se current user ka UID aur Profile liya
    const { currentUser, userProfile } = useAuth();
    const userId = currentUser?.uid; // ⬅️ Safely extracted UID
    const userName = userProfile?.name || currentUser?.email;

    // 💡 useFirestore hook se 'tasks' collection ka data aur functions liye
    // ⬅️ FIX 2: Filters ko directly hook call mein pass kiya (agar userId hai)
    const { 
        data: tasks, // Ab isko direct 'tasks' bolte hain
        loading: loadingData, 
        error: dataError,
        updateDocument, 
        addDocument    
    } = useFirestore(
        'tasks', 
        userId ? [['assignedToId', '==', userId]] : null // ⬅️ CRASH FIX: Agar userId NULL hai, toh query mat chalao
    ); 

    // 💡 List filtering ab simple ho gaya hai, kyunki hook ne pehle hi filter kar diya
    const myTasks = tasks || []; 

    // 💡 Naya task create karna (Employee self-assigned task bana sakta hai)
    const handleCreateTask = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoadingForm(true);

        if (!newTaskTitle) {
            setMessage("Task title cannot be empty.");
            setLoadingForm(false);
            return;
        }
        
        // ⬅️ FIX 3: User ID check (Submission se pehle)
        if (!userId) {
             setMessage("Error: User not authenticated.");
             setLoadingForm(false);
             return;
        }


        const newEmployeeTask = {
            title: newTaskTitle,
            assignedToId: userId, // ⬅️ Safely used userId
            assignedToEmail: userName, // ⬅️ Safely used user name/email
            status: 'Pending',
            createdAt: new Date(),
            dueDate: 'N/A' 
        };

        try {
            await addDocument(newEmployeeTask);
            setMessage(`Success! Task "${newTaskTitle}" added to your list.`);
            setNewTaskTitle('');
        } catch (error) {
            setMessage(`Error creating task: ${error.message}`);
        } finally {
            setLoadingForm(false);
        }
    };
    
    // 💡 Task status update karna (CRUD - Update)
    const handleToggleComplete = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
        
        try {
            await updateDocument(taskId, { 
                status: newStatus,
                completedAt: newStatus === 'Completed' ? new Date() : null 
            });
            setMessage(`Task ${newStatus} successfully.`);
            
        } catch (error) {
            setMessage(`Error updating task status: ${error.message}`);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
         
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            
                <main style={{ padding: '20px', backgroundColor: '#f4f7f9', flexGrow: 1 }}>
                    <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', color: '#007bff' }}>
                        My Task List
                    </h2>

                    {/* 1. Add New Task Form (CRUD - Create) */}
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <h3>Add Self-Assigned Task</h3>
                        <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: '15px' }}>
                            <input
                                type="text"
                                placeholder="Task Title (e.g., Learn Python)"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                required
                                style={{ flexGrow: 1, padding: '10px' }}
                            />
                            <button type="submit" disabled={loadingForm} style={submitButtonStyle}>
                                {loadingForm ? 'Adding...' : 'Add Task'}
                            </button>
                        </form>
                        {message && <p style={{ marginTop: '10px', color: message.startsWith('Error') ? 'red' : 'green' }}>{message}</p>}
                    </div>


                    {/* 2. Tasks List (CRUD - Read) */}
                    <h3>My Pending Tasks ({myTasks.filter(t => t.status === 'Pending').length})</h3>
                    {loadingData && <LoadingSpinner message="Fetching your tasks from Firestore..." size="40px" />}
                    {dataError && <p style={{ color: 'red' }}>Error loading tasks: {dataError}</p>}

                    {!loadingData && myTasks.length > 0 && (
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <ul style={{ listStyleType: 'none', padding: 0 }}>
                                {myTasks.sort((a,b) => (a.status === 'Pending' ? -1 : 1)).map(task => (
                                    <li key={task.id} style={{ ...taskListItemStyle, backgroundColor: task.status === 'Completed' ? '#e9f5e9' : 'white' }}>
                                        <span style={{ textDecoration: task.status === 'Completed' ? 'line-through' : 'none', color: '#333' }}>
                                            {task.title}
                                        </span>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 'bold', color: task.status === 'Pending' ? '#dc3545' : '#28a745', fontSize: '0.9em' }}>
                                                {task.status}
                                            </span>
                                            <button 
                                                onClick={() => handleToggleComplete(task.id, task.status)}
                                                style={{ ...toggleButtonStyle, backgroundColor: task.status === 'Completed' ? '#ffc107' : '#28a745' }}
                                            >
                                                {task.status === 'Completed' ? 'Mark Pending' : 'Mark Complete'}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {/* Agar data load ho gaya aur tasks nahi mile */}
                    {!loadingData && myTasks.length === 0 && <p>No tasks assigned yet. Add a self-assigned task above!</p>}
                </main>
            </div>
        </div>
    );
}

// Internal Styles (remains the same)
const submitButtonStyle = { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const toggleButtonStyle = { color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' };
const taskListItemStyle = { padding: '12px 15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };

export default MyTasks;