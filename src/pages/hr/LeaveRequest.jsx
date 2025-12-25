// src/pages/hr/LeaveRequests.jsx

import React, { useState } from 'react';
import { useFirestore } from '../../hooks/useFirestore'; 
import { useAuth } from '../../context/AuthContext'; 
import LoadingSpinner from '../../components/common/LoadingSpinner';

function LeaveRequests() {
    const [message, setMessage] = useState('');
    
    // Auth & Identity
    const { currentUser } = useAuth();
    const reviewerEmail = currentUser?.email || 'System User'; 

    // Firestore Hook
    const { 
        data: allLeaves, 
        loading: loadingData, 
        error: dataError,
        updateDocument 
    } = useFirestore('leaves'); 

    // Filter: Pending Only
    const pendingLeaves = allLeaves 
        ? allLeaves.filter(leave => leave.status === 'Pending') 
        : [];

    // Action Handler
    const handleAction = async (leaveId, actionStatus) => {
        setMessage('');
        
        try {
            await updateDocument(leaveId, { 
                status: actionStatus,
                reviewedBy: reviewerEmail, 
                reviewedAt: new Date()
            });
            
            setMessage(`Success! Request has been marked as ${actionStatus}.`);
            
            // Auto-hide message after 3 seconds
            setTimeout(() => setMessage(''), 3000);
            
        } catch (error) {
            setMessage(`Error updating status: ${error.message}`);
        }
    };

    // Helper: Badge Colors for Leave Type
    const getLeaveBadgeColor = (type) => {
        switch(type) {
            case 'Sick Leave': return 'bg-red-100 text-red-700 border-red-200';
            case 'Casual Leave': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Annual Leave': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Leave Approvals</h2>
                    <p className="text-sm text-gray-500 mt-1">Review and manage employee leave applications.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Pending:</span>
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-sm font-bold">
                        {pendingLeaves.length}
                    </span>
                </div>
            </div>

            {/* --- MESSAGES --- */}
            {message && (
                <div className={`mb-6 p-4 rounded-lg text-sm font-medium flex items-center gap-2 animate-fade-in-down ${message.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                    {message.startsWith('Error') ? '❌' : '✅'} {message}
                </div>
            )}

            {/* --- LOADING & ERROR --- */}
            {loadingData && <div className="p-12"><LoadingSpinner message="Fetching requests..." size="40px" /></div>}
            {dataError && <div className="text-red-500 p-4 border border-red-200 bg-red-50 rounded-lg">Error: {dataError}</div>}

            {/* --- EMPTY STATE --- */}
            {!loadingData && pendingLeaves.length === 0 && !dataError && (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 text-center">
                    <div className="bg-green-50 p-4 rounded-full mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-800">All Caught Up!</h4>
                    <p className="text-gray-500 mt-1">No pending leave requests at the moment.</p>
                </div>
            )}

            {/* --- REQUESTS TABLE --- */}
            {!loadingData && pendingLeaves.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Leave Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pendingLeaves.map(leave => (
                                    <tr key={leave.id} className="hover:bg-gray-50/80 transition-colors">
                                        
                                        {/* Employee Name */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                    {leave.userName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="font-semibold text-gray-800">{leave.userName}</div>
                                            </div>
                                        </td>
                                        
                                        {/* Type */}
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getLeaveBadgeColor(leave.leaveType)}`}>
                                                {leave.leaveType}
                                            </span>
                                        </td>
                                        
                                        {/* Duration */}
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <span className="font-medium text-gray-800">{leave.startDate}</span> 
                                            <span className="text-gray-400 mx-2">➔</span> 
                                            <span className="font-medium text-gray-800">{leave.endDate}</span>
                                        </td>
                                        
                                        {/* Reason */}
                                        <td className="px-6 py-4 max-w-xs truncate" title={leave.reason}>
                                            <span className="text-gray-500 text-sm italic">"{leave.reason}"</span>
                                        </td>
                                        
                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleAction(leave.id, 'Approved')}
                                                    className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    Approve
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleAction(leave.id, 'Rejected')}
                                                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LeaveRequests;