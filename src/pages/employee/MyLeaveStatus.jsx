// src/pages/employee/MyLeaveStatus.jsx

import React, { useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as XLSX from 'xlsx';

function MyLeaveStatus() {
    const { currentUser } = useAuth();

    // 1. Logic (UNCHANGED)
    const filters = useMemo(() => {
        return currentUser ? [['userId', '==', currentUser.uid]] : [];
    }, [currentUser]);

    const { data: myLeaves, loading, error } = useFirestore('leaves', filters);

    // 🛠️ HELPER: DATE FORMATTER (Robust Fix - Kept Exact)
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
            if (timestamp instanceof Date) return timestamp.toLocaleDateString();
            return new Date(timestamp).toLocaleDateString();
        } catch (err) {
            return 'Invalid Date';
        }
    };

    // 🎨 UI Helper: Status Badge
    const getStatusBadge = (status) => {
        const baseStyle = "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 w-fit";
        switch (status) {
            case 'Approved': 
                return (
                    <span className={`${baseStyle} bg-emerald-50 text-emerald-700 border-emerald-200`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        Approved
                    </span>
                );
            case 'Rejected': 
                return (
                    <span className={`${baseStyle} bg-red-50 text-red-700 border-red-200`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        Rejected
                    </span>
                );
            default: 
                return (
                    <span className={`${baseStyle} bg-yellow-50 text-yellow-700 border-yellow-200`}>
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Pending
                    </span>
                );
        }
    };

    // 📥 Logic: Download Report (UNCHANGED)
    const handleDownloadReport = () => {
        if (!myLeaves || myLeaves.length === 0) return alert("No data to download!");
        const exportData = myLeaves.map(leave => ({
            "Leave Type": leave.leaveType,
            "Start Date": leave.startDate,
            "End Date": leave.endDate,
            "Reason": leave.reason,
            "Applied On": formatDate(leave.createdAt),
            "Status": leave.status,
            "Reviewer Info": leave.reviewedBy ? `By: ${leave.reviewedBy}` : '-'
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "My Leaves");
        XLSX.writeFile(wb, `My_Leave_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Application History</h2>
                    <p className="text-sm text-gray-500 mt-1">Track the status of your leave requests.</p>
                </div>
                
                {!loading && myLeaves && myLeaves.length > 0 && (
                    <button 
                        onClick={handleDownloadReport} 
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all font-medium text-sm active:scale-95"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export to Excel
                    </button>
                )}
            </div>

            {/* --- LOADING & ERROR STATES --- */}
            {loading && <div className="p-10"><LoadingSpinner message="Fetching your records..." size="40px" /></div>}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Error: {error}
                </div>
            )}

            {/* --- EMPTY STATE --- */}
            {!loading && myLeaves?.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 text-center">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-800">No leave history found</h4>
                    <p className="text-gray-500 mt-1">You haven't applied for any leaves yet.</p>
                </div>
            )}

            {/* --- DATA TABLE --- */}
            {!loading && myLeaves?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {["Leave Type", "Duration", "Reason", "Applied On", "Status", "Reviewer Note"].map(h => (
                                        <th key={h} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {myLeaves
                                    .sort((a, b) => {
                                        // Robust Sorting (Logic same as before)
                                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                                        return dateB - dateA;
                                    })
                                    .map((leave) => (
                                    <tr key={leave.id} className="hover:bg-gray-50/80 transition-colors">
                                        
                                        {/* Type */}
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-800">{leave.leaveType}</span>
                                        </td>
                                        
                                        {/* Duration */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">
                                                <span className="font-medium text-gray-800">{leave.startDate}</span> 
                                                <span className="text-gray-400 mx-1">to</span> 
                                                <span className="font-medium text-gray-800">{leave.endDate}</span>
                                            </div>
                                        </td>
                                        
                                        {/* Reason */}
                                        <td className="px-6 py-4 max-w-xs truncate" title={leave.reason}>
                                            <span className="text-gray-600 italic">"{leave.reason}"</span>
                                        </td>
                                        
                                        {/* Applied On */}
                                        <td className="px-6 py-4 text-sm text-blue-600 font-medium">
                                            {formatDate(leave.createdAt)}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            {getStatusBadge(leave.status)}
                                        </td>

                                        {/* Reviewer Note */}
                                        <td className="px-6 py-4 text-sm">
                                            {leave.status !== 'Pending' ? (
                                                <div className="flex flex-col">
                                                    <span className="text-gray-800 font-medium text-xs">By {leave.reviewedBy || 'HR'}</span>
                                                    <span className="text-gray-400 text-[10px]">{formatDate(leave.reviewedAt)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
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

export default MyLeaveStatus;