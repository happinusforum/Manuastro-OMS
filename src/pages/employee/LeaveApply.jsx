// src/pages/employee/LeaveApply.jsx

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
    
    // 💡 Firestore & Auth Hooks
    const { addDocument } = useFirestore('leaves'); 
    const { currentUser, userProfile } = useAuth(); 

    const userId = currentUser?.uid;
    const userName = userProfile?.name || currentUser?.email;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 💡 SUBMIT LOGIC (UNCHANGED)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);

        if (formData.type === 'leave' && (!formData.startDate || !formData.endDate)) {
            setMessage("Error: Please select both start and end dates.");
            setLoading(false);
            return;
        }

        if (!formData.reason) {
            setMessage("Error: Please provide a reason.");
            setLoading(false);
            return;
        }
        
        if (!userId) {
             setMessage("Error: User authentication data is missing. Please log in again.");
             setLoading(false);
             return;
        }

        const newLeaveRequest = {
            ...formData,
            userId: userId, 
            userName: userName, 
            empId: userProfile?.empId || 'N/A', // Added EmpID for Admin reference
            submittedAt: new Date(),
            status: 'Pending', 
        };

        try {
            await addDocument(newLeaveRequest);
            setMessage("Success! Your request has been submitted to HR.");
            setFormData(initialFormState); // Form reset
        } catch (error) {
            setMessage(`Error submitting request: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER --- */}
            <div className="mb-8 text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800">Submit Request</h2>
                <p className="text-sm text-gray-500 mt-1">Apply for leaves or submit general queries to the HR department.</p>
            </div>

            {/* --- FORM CARD --- */}
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-8">
                    
                    {/* Feedback Messages */}
                    {message && (
                        <div className={`mb-6 p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${message.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                            {message.startsWith('Error') ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* 1. Request Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">I want to...</label>
                            <select 
                                name="type" 
                                value={formData.type} 
                                onChange={handleChange} 
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="leave">Apply for Leave 🏖️</option>
                                <option value="query">Raise a Query / Complaint 📢</option>
                            </select>
                        </div>

                        {/* 2. Leave Specific Fields */}
                        {formData.type === 'leave' && (
                            <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100 space-y-5 animate-fade-in-up">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Leave Category</label>
                                    <select 
                                        name="leaveType" 
                                        value={formData.leaveType} 
                                        onChange={handleChange} 
                                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="Sick Leave">Sick Leave 🤒</option>
                                        <option value="Casual Leave">Casual Leave 🏠</option>
                                        <option value="Annual Leave">Annual Leave ✈️</option>
                                        <option value="Emergency Leave">Emergency Leave 🚨</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From Date</label>
                                        <input 
                                            type="date" 
                                            name="startDate" 
                                            value={formData.startDate} 
                                            onChange={handleChange} 
                                            required={formData.type === 'leave'}
                                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To Date</label>
                                        <input 
                                            type="date" 
                                            name="endDate" 
                                            value={formData.endDate} 
                                            onChange={handleChange} 
                                            required={formData.type === 'leave'}
                                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Reason / Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {formData.type === 'leave' ? 'Reason for Leave' : 'Describe your Query'}
                            </label>
                            <textarea 
                                name="reason" 
                                value={formData.reason} 
                                onChange={handleChange} 
                                placeholder={formData.type === 'leave' ? "e.g., Not feeling well, Family function..." : "e.g., Issue with payroll, Access request..."}
                                required 
                                rows="4"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                            />
                        </div>

                        {/* 4. Submit Button */}
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className={`w-full py-3 rounded-lg text-white font-bold shadow-md transition-all flex justify-center items-center gap-2
                            ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95'}`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Send Request
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </>
                            )}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
}

export default LeaveApply;