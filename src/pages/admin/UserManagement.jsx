// src/pages/admin/UserManagement.jsx

import React, { useState, useMemo } from 'react';
import { createUserWithProfile, updateEmployeeProfile } from '../../api/EmployeeService'; 
import { useFirestore } from '../../hooks/useFirestore'; 
import { auth } from '../../Firebase'; 
import LoadingSpinner from '../../components/common/LoadingSpinner'; 

const initialEditState = { id: null, name: '', empId: '', role: '', phoneNumber: '', address: '' };

function UserManagement() {
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('employee');
    const [newEmpId, setNewEmpId] = useState(''); 
    const [newName, setNewName] = useState(''); 
    const [newPhone, setNewPhone] = useState(''); 
    
    const [editingUser, setEditingUser] = useState(null); 
    const [editFormData, setEditFormData] = useState(initialEditState);
    const [message, setMessage] = useState('');
    const [loadingForm, setLoadingForm] = useState(false);
    
    // Fetch Data
    const { data: rawUsers, loading: loadingData, error: dataError, deleteDocument } = useFirestore('users'); 

    // 💡 SORTING LOGIC (KEPT EXACTLY SAME)
    const users = useMemo(() => {
        if (!rawUsers) return [];

        return [...rawUsers].sort((a, b) => {
            // Helper to extract number from EmpID (e.g., "MA/IT/006" -> 6)
            const getNumber = (id) => {
                if (!id) return 0;
                const match = id.match(/\d+$/); // Last number dhoondo
                return match ? parseInt(match[0], 10) : 0;
            };

            const numA = getNumber(a.empId);
            const numB = getNumber(b.empId);

            return numA - numB; // Ascending Order (001, 002, 003...)
        });
    }, [rawUsers]);

    // --- CREATE LOGIC (SAME) ---
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoadingForm(true);

        if (newPassword.length < 6) {
            setMessage("Error: Password must be at least 6 characters long.");
            setLoadingForm(false); return;
        }
        if (!newName || !newEmpId) {
            setMessage("Error: Name and Employee ID are required.");
            setLoadingForm(false); return;
        }

        try {
            const profileData = {
                name: newName,
                empId: newEmpId,
                role: newRole,
                phoneNumber: newPhone,
                remainingLeaves: 15,
            };
            await createUserWithProfile(newUserEmail, newPassword, profileData);
            setMessage(`Success! User ${newUserEmail} created with role: ${newRole}.`);
            setNewUserEmail(''); setNewPassword(''); setNewName(''); setNewEmpId(''); setNewPhone('');
        } catch (error) {
            setMessage(`Error creating user: ${error.message}`);
        } finally {
            setLoadingForm(false);
        }
    };
    
    // --- DELETE LOGIC (SAME) ---
    const handleDeleteUser = async (userId, userEmail) => {
        if (window.confirm(`Are you sure you want to delete user: ${userEmail}?`)) {
             if (userId === auth.currentUser.uid) {
                setMessage("Error: You cannot delete your own account while logged in!");
                return;
             }
             try {
                await deleteDocument(userId); 
                setMessage(`Success! User ${userEmail} deleted from Firestore.`);
             } catch (error) {
                 setMessage(`Error deleting user: ${error.message}`);
             }
         }
    };
    
    // --- EDIT LOGIC (SAME) ---
    const handleEditSetup = (user) => {
        setEditFormData({
            id: user.id,
            name: user.name || '',
            empId: user.empId || '',
            role: user.role || 'employee',
            phoneNumber: user.phoneNumber || '',
            address: user.address || '',
        });
        setEditingUser(user); 
        setMessage(''); 
    };

    const handleEditChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    // --- UPDATE LOGIC (SAME) ---
    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setLoadingForm(true);
        try {
            const updates = {
                name: editFormData.name,
                empId: editFormData.empId,
                role: editFormData.role,
                phoneNumber: editFormData.phoneNumber,
                address: editFormData.address,
            };
            await updateEmployeeProfile(editFormData.id, updates);
            setMessage(`Success! Profile for ${editFormData.name} updated.`);
            setEditingUser(null); setEditFormData(initialEditState);
        } catch (error) {
            setMessage(`Error updating user: ${error.message}`);
        } finally {
            setLoadingForm(false);
        }
    };

    // Helper for Role Badges
    const getRoleBadgeColor = (role) => {
        switch(role?.toLowerCase()) {
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'hr': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-green-100 text-green-700 border-green-200';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                <p className="text-sm text-gray-500 mt-1">Create, edit, and manage system access.</p>
            </div>

            {/* --- CREATE USER CARD --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                        </span>
                        Create New User
                    </h3>
                </div>

                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <input type="email" placeholder="Email Address" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                    
                    <input type="password" placeholder="Password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                    
                    <input type="text" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} required 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                    
                    <input type="text" placeholder="Emp ID (e.g. MA/IT/001)" value={newEmpId} onChange={(e) => setNewEmpId(e.target.value)} required 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                    
                    <input type="tel" placeholder="Phone Number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                    
                    <select value={newRole} onChange={(e) => setNewRole(e.target.value)} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                    >
                        <option value="employee">Employee</option>
                        <option value="hr">HR</option>
                        <option value="admin">Admin</option>
                    </select>

                    <button type="submit" disabled={loadingForm} 
                        className={`md:col-span-1 lg:col-span-3 mt-2 px-6 py-2.5 font-medium rounded-lg text-white shadow-md transition-all flex justify-center items-center gap-2
                        ${loadingForm ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}
                    >
                        {loadingForm ? 'Creating...' : '+ Create User'}
                    </button>
                </form>

                {message && (
                    <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${message.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                        {message}
                    </div>
                )}
            </div>

            {/* --- USER LIST TABLE --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">All Users</h3>
                    <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">Total: {users ? users.length : 0}</span>
                </div>

                {loadingData && <div className="p-8"><LoadingSpinner message="Fetching user list..." size="40px" /></div>} 
                {dataError && <p className="p-8 text-red-500 text-center font-bold">Error loading data: {dataError}</p>}

                {!loadingData && users && (
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name / ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-800">{user.name || 'Unknown'}</span>
                                                <span className="text-xs text-gray-500 font-mono">{user.empId || 'No ID'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div>{user.email}</div>
                                            <div className="text-xs text-gray-400">{user.phoneNumber}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)} uppercase tracking-wide`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => handleEditSetup(user)} 
                                                className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded text-xs font-medium transition-colors">
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(user.id, user.email)} 
                                                disabled={user.id === auth.currentUser.uid || user.role === 'admin'} 
                                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
                                                    ${(user.id === auth.currentUser.uid || user.role === 'admin') 
                                                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                                                        : 'text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100'
                                                    }`}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- EDIT MODAL --- */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg">Edit Profile</h3>
                            <button onClick={() => setEditingUser(null)} className="text-blue-200 hover:text-white">✕</button>
                        </div>
                        
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-4">Editing user: <span className="font-semibold text-gray-800">{editingUser.email}</span></p>
                            
                            <form onSubmit={handleUpdateUser} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name</label>
                                    <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} required 
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Emp ID</label>
                                        <input type="text" name="empId" value={editFormData.empId} onChange={handleEditChange} required 
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Role</label>
                                        <select name="role" value={editFormData.role} onChange={handleEditChange} required 
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                            <option value="employee">Employee</option>
                                            <option value="hr">HR</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone</label>
                                    <input type="tel" name="phoneNumber" value={editFormData.phoneNumber} onChange={handleEditChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Address</label>
                                    <textarea name="address" value={editFormData.address} onChange={handleEditChange} rows="2"
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                                </div>

                                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={() => setEditingUser(null)} 
                                        className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100 font-medium transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={loadingForm} 
                                        className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors disabled:bg-blue-400">
                                        {loadingForm ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;