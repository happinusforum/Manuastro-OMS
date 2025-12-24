// src/pages/employee/MyLeaveStatus.jsx (FIXED DATE ISSUE)

import React, { useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as XLSX from 'xlsx';

function MyLeaveStatus() {
    const { currentUser } = useAuth();

    const filters = useMemo(() => {
        return currentUser ? [['userId', '==', currentUser.uid]] : [];
    }, [currentUser]);

    const { data: myLeaves, loading, error } = useFirestore('leaves', filters);

    // 🛠️ HELPER: DATE FORMATTER (Robust Fix)
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            // Case 1: Firestore Timestamp
            if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
            // Case 2: JavaScript Date Object
            if (timestamp instanceof Date) return timestamp.toLocaleDateString();
            // Case 3: String (ISO format)
            return new Date(timestamp).toLocaleDateString();
        } catch (err) {
            return 'Invalid Date';
        }
    };

    const getStatusBadge = (status) => {
        const styles = { padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-block' };
        switch (status) {
            case 'Approved': return <span style={{ ...styles, backgroundColor: '#d4edda', color: '#155724' }}>✅ Approved</span>;
            case 'Rejected': return <span style={{ ...styles, backgroundColor: '#f8d7da', color: '#721c24' }}>❌ Rejected</span>;
            default: return <span style={{ ...styles, backgroundColor: '#fff3cd', color: '#856404' }}>⏳ Pending</span>;
        }
    };

    const handleDownloadReport = () => {
        if (!myLeaves || myLeaves.length === 0) return alert("No data to download!");
        const exportData = myLeaves.map(leave => ({
            "Leave Type": leave.leaveType,
            "Start Date": leave.startDate,
            "End Date": leave.endDate,
            "Reason": leave.reason,
            "Applied On": formatDate(leave.createdAt), // Used Helper Here
            "Status": leave.status,
            "Reviewer Info": leave.reviewedBy ? `By: ${leave.reviewedBy}` : '-'
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "My Leaves");
        XLSX.writeFile(wb, `My_Leave_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">My Leave Application Status</h2>
                {!loading && myLeaves && myLeaves.length > 0 && (
                    <button onClick={handleDownloadReport} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition flex items-center gap-2 font-medium">
                        📥 Download Report
                    </button>
                )}
            </div>

            {loading && <LoadingSpinner message="Fetching your records..." />}
            {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">Error: {error}</div>}

            {!loading && myLeaves?.length === 0 && (
                <div className="text-center p-10 bg-white rounded shadow text-gray-500">
                    <h4>No leave history found.</h4>
                    <p>Aapne abhi tak koi chutti apply nahi ki hai.</p>
                </div>
            )}

            {!loading && myLeaves?.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-200 text-left">
                                {["Leave Type", "Duration", "Reason", "Applied On", "Status", "Reviewer Note"].map(h => (
                                    <th key={h} className="px-5 py-3 text-gray-600 font-semibold text-sm">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {myLeaves
                                .sort((a, b) => {
                                    // 🛠️ Robust Sorting
                                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                                    return dateB - dateA;
                                })
                                .map((leave) => (
                                <tr key={leave.id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-5 py-4 bg-white text-sm"><p className="text-gray-900 font-bold">{leave.leaveType}</p></td>
                                    <td className="px-5 py-4 bg-white text-sm"><p className="text-gray-900 whitespace-no-wrap">{leave.startDate} <span className="text-gray-500">to</span> {leave.endDate}</p></td>
                                    <td className="px-5 py-4 bg-white text-sm"><p className="text-gray-600 italic">"{leave.reason}"</p></td>
                                    
                                    {/* 🛠️ FIX APPLIED HERE */}
                                    <td className="px-5 py-4 bg-white text-sm font-medium text-blue-600">
                                        {formatDate(leave.createdAt)}
                                    </td>

                                    <td className="px-5 py-4 bg-white text-sm">{getStatusBadge(leave.status)}</td>
                                    <td className="px-5 py-4 bg-white text-sm">
                                        {leave.status !== 'Pending' ? (
                                            <span className="text-xs text-gray-500">Reviewed by: {leave.reviewedBy || 'HR'}<br/>On: {formatDate(leave.reviewedAt)}</span>
                                        ) : <span className="text-gray-400">-</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default MyLeaveStatus;