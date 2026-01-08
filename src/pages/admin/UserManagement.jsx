// src/pages/admin/UserManagement.jsx

import React, { useState, useMemo } from 'react';
import { createUserWithProfile, updateEmployeeProfile } from '../../api/EmployeeService'; 
import { useFirestore } from '../../hooks/useFirestore'; 
import { auth } from '../../Firebase'; 
import LoadingSpinner from '../../components/common/LoadingSpinner'; 
import * as XLSX from 'xlsx'; 

// 🎨 Icons & Animations
import { motion, AnimatePresence } from 'framer-motion';
import { 
    UserPlus, Trash2, Edit, CheckCircle, AlertCircle, 
    Search, Shield, Briefcase, User, Phone, MapPin, X, Download
} from 'lucide-react';

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
    const [searchTerm, setSearchTerm] = useState('');
    
    // Fetch Data
    const { data: rawUsers, loading: loadingData, error: dataError, deleteDocument } = useFirestore('users'); 

    // 💡 SORTING & FILTERING LOGIC
    const users = useMemo(() => {
        if (!rawUsers) return [];
        
        let filtered = rawUsers;
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = rawUsers.filter(u => 
                u.name?.toLowerCase().includes(lowerTerm) || 
                u.email?.toLowerCase().includes(lowerTerm) ||
                u.empId?.toLowerCase().includes(lowerTerm)
            );
        }

        return [...filtered].sort((a, b) => {
            const getNumber = (id) => {
                if (!id) return 0;
                const match = id.match(/\d+$/); 
                return match ? parseInt(match[0], 10) : 0;
            };
            const numA = getNumber(a.empId);
            const numB = getNumber(b.empId);
            return numA - numB; 
        });
    }, [rawUsers, searchTerm]);

    // --- EXPORT TO EXCEL LOGIC ---
    const handleExportToExcel = () => {
        if (!users || users.length === 0) {
            setMessage("No users to export.");
            return;
        }

        const worksheetData = users.map(user => ({
            "Full Name": user.name || "N/A",
            "Employee ID": user.empId || "N/A",
            "Email": user.email || "N/A",
            "Role": user.role || "N/A",
            "Phone Number": user.phoneNumber || "N/A",
            "Address": user.address || "N/A",
            "Remaining Leaves": user.remainingLeaves || 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
        
        XLSX.writeFile(workbook, "Employee_List.xlsx");
        setMessage("Success! Employee list downloaded.");
    };

    // --- CREATE LOGIC ---
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoadingForm(true);

        if (newPassword.length < 6) {
            setMessage("Password must be at least 6 characters long.");
            setLoadingForm(false); return;
        }
        if (!newName || !newEmpId) {
            setMessage("Name and Employee ID are required.");
            setLoadingForm(false); return;
        }

        try {
            const profileData = {
                name: newName, empId: newEmpId, role: newRole, phoneNumber: newPhone, remainingLeaves: 15,
            };
            await createUserWithProfile(newUserEmail, newPassword, profileData);
            setMessage(`Success! User created successfully.`);
            setNewUserEmail(''); setNewPassword(''); setNewName(''); setNewEmpId(''); setNewPhone('');
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoadingForm(false);
        }
    };
    
    // --- DELETE LOGIC ---
    const handleDeleteUser = async (userId, userEmail) => {
        if (window.confirm(`Delete user: ${userEmail}?`)) {
             if (userId === auth.currentUser.uid) {
                setMessage("Cannot delete your own account!");
                return;
             }
             try {
                await deleteDocument(userId); 
                setMessage(`User deleted successfully.`);
             } catch (error) {
                 setMessage(`Error deleting: ${error.message}`);
             }
         }
    };
    
    // --- EDIT LOGIC ---
    const handleEditSetup = (user) => {
        setEditFormData({
            id: user.id, name: user.name || '', empId: user.empId || '', role: user.role || 'employee',
            phoneNumber: user.phoneNumber || '', address: user.address || '',
        });
        setEditingUser(user); setMessage(''); 
    };

    const handleEditChange = (e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setLoadingForm(true);
        try {
            const updates = {
                name: editFormData.name, empId: editFormData.empId, role: editFormData.role,
                phoneNumber: editFormData.phoneNumber, address: editFormData.address,
            };
            await updateEmployeeProfile(editFormData.id, updates);
            setMessage(`Profile updated successfully.`);
            setEditingUser(null); setEditFormData(initialEditState);
        } catch (error) {
            setMessage(`Error updating: ${error.message}`);
        } finally {
            setLoadingForm(false);
        }
    };

    // Helper for Role Badges (Dark Mode Aware)
    const getRoleBadgeColor = (role) => {
        switch(role?.toLowerCase()) {
            case 'admin': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
            case 'hr': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
            default: return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
            
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">User Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Manage employee access and profiles.</p>
                </div>
                
                {/* Search Bar & Export Button Container */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search users..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    
                    {/* Export Button */}
                    <button 
                        onClick={handleExportToExcel}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md transition-all font-medium whitespace-nowrap active:scale-95"
                    >
                        <Download size={18} /> Export Excel
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* --- LEFT: CREATE USER FORM --- */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden h-fit sticky top-6"
                >
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm text-white">
                            <UserPlus size={20} />
                        </div>
                        <h3 className="text-white font-bold text-lg">Add New User</h3>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <input type="text" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} required 
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400" />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="Emp ID" value={newEmpId} onChange={(e) => setNewEmpId(e.target.value)} required 
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400" />
                                    
                                    <select value={newRole} onChange={(e) => setNewRole(e.target.value)} 
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                                        <option value="employee">Employee</option>
                                        <option value="hr">HR</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <input type="email" placeholder="Email Address" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required 
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400" />
                                
                                <input type="password" placeholder="Password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required 
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400" />
                                
                                <input type="tel" placeholder="Phone Number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} 
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400" />
                            </div>

                            <button type="submit" disabled={loadingForm} 
                                className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg flex justify-center items-center gap-2 transform transition-all
                                ${loadingForm ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 hover:scale-[1.02] active:scale-95'}`}
                            >
                                {loadingForm ? 'Creating...' : 'Create Account'}
                            </button>
                        </form>

                        {message && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className={`mt-4 p-3 rounded-xl text-sm font-bold flex items-center gap-2
                                ${message.includes('Success') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                {message.includes('Success') ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {message}
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* --- RIGHT: USER LIST --- */}
                <div className="xl:col-span-2 space-y-6">
                    {loadingData && <div className="p-10 text-center"><LoadingSpinner /></div>} 
                    {dataError && <p className="text-red-500 text-center font-bold">Error: {dataError}</p>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence>
                            {!loadingData && users && users.map((user, index) => (
                                <motion.div 
                                    key={user.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-600 dark:text-gray-300">
                                                {user.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 dark:text-gray-100 leading-tight">{user.name}</h4>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{user.empId}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wide flex items-center gap-1 ${getRoleBadgeColor(user.role)}`}>
                                            <Shield size={10} /> {user.role}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            <Briefcase size={14} className="text-gray-400 dark:text-gray-500" />
                                            <span className="truncate">{user.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            <Phone size={14} className="text-gray-400 dark:text-gray-500" />
                                            <span>{user.phoneNumber || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-gray-50 dark:border-gray-700">
                                        <button onClick={() => handleEditSetup(user)} 
                                            className="flex-1 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-1">
                                            <Edit size={14} /> Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user.id, user.email)} 
                                            disabled={user.id === auth.currentUser.uid || user.role === 'admin'} 
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1
                                            ${(user.id === auth.currentUser.uid || user.role === 'admin') 
                                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'}`}
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* --- EDIT MODAL --- */}
            <AnimatePresence>
                {editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700"
                        >
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2"><Edit size={20} /> Edit User</h3>
                                <button onClick={() => setEditingUser(null)} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition"><X size={20} /></button>
                            </div>
                            
                            <div className="p-6">
                                <form onSubmit={handleUpdateUser} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                                            <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} required 
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Role</label>
                                            <select name="role" value={editFormData.role} onChange={handleEditChange} required 
                                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer">
                                                <option value="employee">Employee</option>
                                                <option value="hr">HR</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Emp ID</label>
                                            <input type="text" name="empId" value={editFormData.empId} onChange={handleEditChange} required 
                                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                                            <input type="tel" name="phoneNumber" value={editFormData.phoneNumber} onChange={handleEditChange} 
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Address</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                                            <textarea name="address" value={editFormData.address} onChange={handleEditChange} rows="2"
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end gap-3">
                                        <button type="button" onClick={() => setEditingUser(null)} className="px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold transition">Cancel</button>
                                        <button type="submit" disabled={loadingForm} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg transition active:scale-95">
                                            {loadingForm ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

export default UserManagement;