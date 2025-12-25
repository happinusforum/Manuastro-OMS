// src/pages/employee/Profile.jsx (IMAGE PERSISTENCE FIX)

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { updateEmployeeProfile } from '../../api/EmployeeService'; 
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Placeholder if no image exists
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

function Profile() {
    const { userProfile, loading } = useAuth();
    const fileInputRef = useRef(null); 

    // State
    const [formData, setFormData] = useState({});
    const [previewImage, setPreviewImage] = useState(null); 
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isUpdating, setIsUpdating] = useState(false);
    const [editMode, setEditMode] = useState(false); 

    const currentRole = userProfile?.role;
    // Rule: Only Admins can edit sensitive fields like Name, ID, Role
    const canEditSensitive = currentRole === 'admin'; 

    useEffect(() => {
        if (userProfile) {
            setFormData({
                name: userProfile.name || '',
                empId: userProfile.empId || '',
                email: userProfile.email || '',
                phoneNumber: userProfile.phoneNumber || '',
                address: userProfile.address || '',
                role: userProfile.role || 'employee',
            });
            // Load saved photo or default
            setPreviewImage(userProfile.photoURL || DEFAULT_AVATAR);
        }
    }, [userProfile]);

    // --- 📸 HANDLE IMAGE SELECTION & CONVERT TO BASE64 ---
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Restriction: Limit file size to 1MB (Firestore limit is small for documents)
            if (file.size > 1024 * 1024) {
                setMessage({ type: 'error', text: '❌ Image size too large! Please choose an image under 1MB.' });
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result); // This result is the Base64 string
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        if (editMode) fileInputRef.current.click();
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setIsUpdating(true);

        try {
            const updates = {
                phoneNumber: formData.phoneNumber,
                address: formData.address,
                photoURL: previewImage, // 🔥 Save the Base64 string to Firestore
                ...(canEditSensitive && {
                    name: formData.name,
                    empId: formData.empId,
                    role: formData.role
                })
            };

            // Call API to update Firestore
            await updateEmployeeProfile(userProfile.uid, updates);
            
            setMessage({ type: 'success', text: '✅ Profile updated successfully!' });
            setEditMode(false); 
            
            // Optional: Force a small delay reload if context doesn't update automatically
            // window.location.reload(); 
            
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Update Failed: ' + error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading || !userProfile) return <div className="flex h-screen items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-100 py-10 px-4 flex justify-center items-start">
            
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
                
                {/* 🎨 1. HEADER BANNER */}
                <div className="h-40 bg-gradient-to-r from-blue-600 to-purple-600 relative">
                    <div className="absolute -bottom-16 left-8 group">
                        {/* Profile Image Circle */}
                        <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
                            <img 
                                src={previewImage} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                            
                            {/* Camera Icon Overlay (Visible in Edit Mode) */}
                            {editMode && (
                                <div 
                                    onClick={triggerFileInput}
                                    className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                >
                                    <span className="text-white text-2xl">📷</span>
                                </div>
                            )}
                        </div>
                        {/* Hidden Input */}
                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                    </div>
                </div>

                {/* 📝 2. ACTION BAR */}
                <div className="mt-16 px-8 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{formData.name}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            currentRole === 'admin' ? 'bg-red-100 text-red-600' : 
                            currentRole === 'hr' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                            {currentRole}
                        </span>
                    </div>
                    
                    {!editMode ? (
                        <button 
                            onClick={() => setEditMode(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow transition transform hover:-translate-y-1 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                    setEditMode(false);
                                    setPreviewImage(userProfile.photoURL || DEFAULT_AVATAR); // Revert image on cancel
                                }}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateProfile}
                                disabled={isUpdating}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow transition flex items-center gap-2 font-medium"
                            >
                                {isUpdating ? 'Saving...' : '💾 Save Changes'}
                            </button>
                        </div>
                    )}
                </div>

                {/* 📩 MESSAGE ALERT */}
                {message.text && (
                    <div className={`mx-8 mt-4 p-3 rounded-lg text-sm font-semibold text-center border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* 📋 3. FORM SECTIONS */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                    
                    {/* Section: Official Info (Read-Only for Employees) */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                            <span className="text-xl">🏢</span>
                            <h3 className="text-lg font-bold text-gray-700">Official Details</h3>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Employee ID</label>
                            <input 
                                type="text" name="empId" value={formData.empId} onChange={handleChange} 
                                disabled={!canEditSensitive || !editMode} 
                                className={`w-full p-3 rounded-lg border transition ${!canEditSensitive ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'}`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Official Email</label>
                            <input 
                                type="email" name="email" value={formData.email} 
                                disabled={true} 
                                className="w-full p-3 rounded-lg border bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                            <input 
                                type="text" name="name" value={formData.name} onChange={handleChange}
                                disabled={!canEditSensitive || !editMode}
                                className={`w-full p-3 rounded-lg border transition ${(!canEditSensitive || !editMode) ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'}`}
                            />
                        </div>
                    </div>

                    {/* Section: Personal Info (Editable by Everyone) */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                            <span className="text-xl">👤</span>
                            <h3 className="text-lg font-bold text-gray-700">Personal Contact</h3>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                            <input 
                                type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange}
                                disabled={!editMode}
                                placeholder="+91 98765 43210"
                                className={`w-full p-3 rounded-lg border transition ${!editMode ? 'bg-transparent border-transparent px-0 font-bold text-gray-800' : 'bg-white border-gray-300 focus:ring-2 focus:ring-green-500'}`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Address</label>
                            <textarea 
                                name="address" rows="3" value={formData.address} onChange={handleChange}
                                disabled={!editMode}
                                placeholder="Enter your full address"
                                className={`w-full p-3 rounded-lg border transition resize-none ${!editMode ? 'bg-transparent border-transparent px-0 font-medium text-gray-800' : 'bg-white border-gray-300 focus:ring-2 focus:ring-green-500'}`}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Profile;