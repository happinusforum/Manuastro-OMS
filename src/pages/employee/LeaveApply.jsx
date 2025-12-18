// src/pages/employee/LeaveApply.jsx (FINAL CODE - Fixing Hook Import & Crash)

import React, { useState } from 'react';

import { useAuth } from '../../context/AuthContext';
// ⬅️ FIX 1: Import path ko file name ke hisaab se 'UseFireStore' rakha, 
//    lekin exported function 'useFirestore' ko lowercase se liya
import { useFirestore } from '../../hooks/useFirestore'; 

const initialFormState = {
    leaveType: 'Sick Leave',
    startDate: '',
    endDate: '',
    reason: '',
    type: 'leave'
};

function LeaveApply() {
    const [formData, setFormData] = useState(initialFormState);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    // 💡 useFirestore se 'leaves' collection ke liye addDocument function liya
    const { addDocument } = useFirestore('leaves'); 
    
    // ⬅️ useAuth se user data liya
    const { currentUser, userProfile } = useAuth(); 

    const userId = currentUser?.uid;
    const userName = userProfile?.name || currentUser?.email;


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 💡 Leave Application Submit karne ka function (CRUD - Create)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);

        if (!formData.startDate || !formData.endDate || !formData.reason) {
            setMessage("Please fill all required fields.");
            setLoading(false);
            return;
        }
        
        // ⬅️ Safety check
        if (!userId) {
             setMessage("Error: User authentication data is missing. Please log in again.");
             setLoading(false);
             return;
        }


        const newLeaveRequest = {
            ...formData,
            userId: userId, 
            userName: userName, 
            submittedAt: new Date(),
            status: 'Pending', 
        };

        try {
            await addDocument(newLeaveRequest);
            setMessage("Success! Your leave request has been submitted to HR.");
            setFormData(initialFormState); // Form reset
            
        } catch (error) {
            setMessage(`Error submitting request: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Render Logic ---
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          
                <main style={{ padding: '20px', backgroundColor: '#f4f7f9', flexGrow: 1 }}>
                    <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
                        Apply Leave / Submit Query
                    </h2>

                    <div style={{ maxWidth: '600px', backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        
                        <form onSubmit={handleSubmit}>
                            {/* Type of Request */}
                            <label style={labelStyle}>Request Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} style={inputStyle}>
                                <option value="leave">Leave Application</option>
                                <option value="query">Complaint / Query</option>
                            </select>

                            {/* Leave Specific Fields */}
                            {formData.type === 'leave' && (
                                <>
                                    <label style={labelStyle}>Leave Type</label>
                                    <select name="leaveType" value={formData.leaveType} onChange={handleChange} style={inputStyle}>
                                        <option value="Sick Leave">Sick Leave</option>
                                        <option value="Casual Leave">Casual Leave</option>
                                        <option value="Annual Leave">Annual Leave</option>
                                    </select>

                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={labelStyle}>Start Date</label>
                                            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} style={inputStyle} required />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={labelStyle}>End Date</label>
                                            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} style={inputStyle} required />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Reason / Description */}
                            <label style={labelStyle}>Reason / Description</label>
                            <textarea 
                                name="reason" 
                                value={formData.reason} 
                                onChange={handleChange} 
                                style={{ ...inputStyle, minHeight: '100px' }} 
                                placeholder="Explain your reason in detail..." 
                                required 
                            />

                            <button type="submit" disabled={loading} style={submitButtonStyle}>
                                {loading ? 'Submitting...' : `Submit ${formData.type === 'leave' ? 'Leave' : 'Request'}`}
                            </button>
                        </form>
                        
                        {message && <p style={{ marginTop: '15px', color: message.startsWith('Error') ? 'red' : 'green' }}>{message}</p>}
                    </div>
                </main>
            </div>
        </div>
    );
}

// Internal Styles
const labelStyle = { display: 'block', margin: '15px 0 5px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px' };
const submitButtonStyle = { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '20px' };

export default LeaveApply;