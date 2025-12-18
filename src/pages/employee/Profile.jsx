// src/pages/employee/Profile.jsx (FINAL CODE - Fixing SRC Error and Logic)

import React, { useState, useEffect } from 'react';

import { useAuth } from '../../context/AuthContext'; // Global profile data ke liye
import { updateEmployeeProfile } from '../../api/EmployeeService'; 
import LoadingSpinner from '../../components/common/LoadingSpinner';

// 💡 FIX 1: Default image URL ko local path diya (Assuming tumhare public folder mein 'default-avatar.png' hai)
const DEFAULT_AVATAR = '/default-avatar.png'; 


function Profile() {
    const { userProfile, loading } = useAuth(); 
    
    const [formData, setFormData] = useState({
        name: '',
        empId: '',
        email: '',
        phoneNumber: '',
        address: '',
        photoURL: DEFAULT_AVATAR, 
    });
    const [message, setMessage] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const currentRole = userProfile?.role;
    const isAdmin = currentRole === 'admin';
    const isReadOnly = !isAdmin;

    // 💡 EFFECT: Jab userProfile load ho, toh form ko data se fill karo
    useEffect(() => {
        if (userProfile) {
            
            // ⬅️ FIX 2: PhotoURL check kiya. Agar empty string ("") hai, to local default use hoga
            const profilePhotoURL = (userProfile.photoURL && userProfile.photoURL !== '') 
                ? userProfile.photoURL 
                : DEFAULT_AVATAR; // ⬅️ Ensures no empty string goes into formData

            setFormData({
                name: userProfile.name || '',
                empId: userProfile.empId || '',
                email: userProfile.email || '',
                phoneNumber: userProfile.phoneNumber || '',
                address: userProfile.address || '',
                photoURL: profilePhotoURL, 
            });
            setMessage('');
        }
    }, [userProfile]);


    // 💡 HANDLE CHANGE: Form data update (Remains the same)
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };


    // 💡 HANDLE UPDATE (Remains the same)
    const handleUpdateProfile = async () => {
        if (isReadOnly) return; 
        
        setMessage('');
        setIsUpdating(true);
        
        try {
            const dataToUpdate = {
                name: formData.name,
                empId: formData.empId,
                phoneNumber: formData.phoneNumber,
                address: formData.address,
            };
            
            await updateEmployeeProfile(userProfile.uid, dataToUpdate);
            setMessage('Profile updated successfully! Refresh to see global changes.');
            
        } catch (error) {
            setMessage('Error updating profile: ' + error.message);
        } finally {
            setIsUpdating(false);
        }
    };


    // 💡 LOADING STATE
    if (loading || !userProfile) {
        return (
            <div className="flex min-h-screen">
             
                <main style={{ padding: '20px', flexGrow: 1 }}><LoadingSpinner message="Fetching user profile..." size="40px" /></main>
            </div>
        );
    }
    
    const inputStyle = { padding: '10px', width: '100%', marginTop: '5px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: isReadOnly ? '#f0f0f0' : 'white' };
    const submitButtonStyle = { padding: '10px 20px', backgroundColor: isReadOnly ? '#aaa' : '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: isReadOnly ? 'not-allowed' : 'pointer', marginTop: '20px' };


    return (
        <div className="flex min-h-screen">
           
            <div className="flex-1 flex flex-col">
              
                <main style={{ padding: '20px', backgroundColor: '#f4f7f9', flexGrow: 1 }}>
                    <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
                        My Profile & Personal Details ({currentRole?.toUpperCase()})
                    </h2>
                    
                    <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mx-auto mt-5">
                        
                        {/* 💡 Photo and Basic Info */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                            {/* ⬅️ FIX 3: src attribute ab local/valid URL lega */}
                            <img src={formData.photoURL} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', marginRight: '20px', objectFit: 'cover' }} />
                            <div>
                                <h3 className="text-xl font-semibold">{formData.name || 'N/A'}</h3>
                                <p className="text-sm text-gray-600"><strong>Emp ID:</strong> {formData.empId || 'N/A'}</p>
                                <p className="text-sm text-blue-600"><strong>Role:</strong> {currentRole?.toUpperCase()}</p>
                            </div>
                        </div>

                        {/* ... (rest of the form remains the same) ... */}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Profile;