// src/pages/admin/UserManagement.jsx (FINAL CODE - Sorted by EmpID)

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

    // 💡 SORTING LOGIC ADDED HERE
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

    // --- CREATE LOGIC ---
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
    
    // --- DELETE LOGIC ---
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
    
    // --- EDIT LOGIC ---
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

    // --- UPDATE LOGIC ---
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

    const inputStyle = { padding: '10px', margin: '5px', border: '1px solid #ccc', borderRadius: '4px', flexGrow: 1, minWidth: '120px' };
    const buttonStyle = { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', margin: '5px' };
    const editButtonStyle = { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <main style={{ padding: '20px', backgroundColor: '#f4f7f9', flexGrow: 1 }}>
                    <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>Admin: User Management</h2>

                    {/* Create User Form */}
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <h3>Create New User (Full Profile)</h3>
                        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            <input type="email" placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required style={inputStyle} />
                            <input type="password" placeholder="Password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={inputStyle} />
                            <input type="text" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} required style={inputStyle} />
                            <input type="text" placeholder="Emp ID (e.g. MA/IT/001)" value={newEmpId} onChange={(e) => setNewEmpId(e.target.value)} required style={inputStyle} />
                            <input type="tel" placeholder="Phone Number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} style={inputStyle} />
                            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ ...inputStyle, minWidth: '150px' }}>
                                <option value="employee">Employee</option>
                                <option value="hr">HR</option>
                                <option value="admin">Admin</option>
                            </select>
                            <button type="submit" disabled={loadingForm} style={{ ...buttonStyle, backgroundColor: loadingForm ? '#6c757d' : '#28a745' }}>
                                {loadingForm ? 'Creating...' : 'Create User'}
                            </button>
                        </form>
                        {message && <p style={{ marginTop: '10px', color: message.startsWith('Error') ? 'red' : 'green' }}>{message}</p>}
                    </div>

                    {/* User List */}
                    <h3>Current Users (Total: {users ? users.length : 0})</h3>
                    {loadingData && <LoadingSpinner message="Fetching user list..." size="40px" />} 
                    {dataError && <p style={{ color: 'red', fontWeight: 'bold' }}>Error loading data: {dataError}</p>}

                    {!loadingData && users && (
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                                        <th style={{ textAlign: 'left', padding: '10px' }}>Name</th>
                                        <th style={{ textAlign: 'left', padding: '10px' }}>Emp ID</th>
                                        <th style={{ textAlign: 'left', padding: '10px' }}>Email</th>
                                        <th style={{ textAlign: 'left', padding: '10px' }}>Role</th>
                                        <th style={{ textAlign: 'left', padding: '10px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '10px' }}>{user.name || 'N/A'}</td> 
                                            <td style={{ padding: '10px', fontWeight: 'bold', color: '#555' }}>{user.empId || 'N/A'}</td>
                                            <td style={{ padding: '10px' }}>{user.email}</td>
                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>{user.role ? user.role.toUpperCase() : 'N/A'}</td>
                                            <td style={{ padding: '10px' }}>
                                                <button onClick={() => handleEditSetup(user)} style={editButtonStyle}>Edit</button>
                                                <button onClick={() => handleDeleteUser(user.id, user.email)} disabled={user.id === auth.currentUser.uid || user.role === 'admin'} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', opacity: (user.id === auth.currentUser.uid || user.role === 'admin') ? 0.5 : 1 }}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
                        <h3>Edit User Profile: {editingUser.name || editingUser.email}</h3>
                        <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                            <label>Name</label><input type="text" name="name" value={editFormData.name} onChange={handleEditChange} required style={inputStyle} />
                            <label>Employee ID</label><input type="text" name="empId" value={editFormData.empId} onChange={handleEditChange} required style={inputStyle} />
                            <label>Phone Number</label><input type="tel" name="phoneNumber" value={editFormData.phoneNumber} onChange={handleEditChange} style={inputStyle} />
                            <label>Role</label>
                            <select name="role" value={editFormData.role} onChange={handleEditChange} required style={inputStyle}>
                                <option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option>
                            </select>
                            <label>Address</label><textarea name="address" value={editFormData.address} onChange={handleEditChange} style={{ ...inputStyle, minHeight: '60px' }} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setEditingUser(null)} style={{ ...buttonStyle, backgroundColor: '#6c757d' }}>Cancel</button>
                                <button type="submit" disabled={loadingForm} style={{ ...buttonStyle, backgroundColor: '#007bff' }}>{loadingForm ? 'Updating...' : 'Save Changes'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;