// src/pages/hr/LeaveRequests.jsx (FINAL CODE - Fixing Hook Import and HR Identity)

import React, { useState, useEffect } from 'react';

// ⬅️ FIX 1: Hook name ko camelCase 'useFirestore' se liya, 
//    lekin path ko file name ke hisaab se 'UseFireStore' rakha
import { useFirestore } from '../../hooks/useFirestore'; 
import { useAuth } from '../../context/AuthContext'; 
import LoadingSpinner from '../../components/common/LoadingSpinner'; // ⬅️ UX fix

function LeaveRequests() {
    const [message, setMessage] = useState('');
    
    // ⬅️ FIX 2: useAuth se HR ki identity nikaali
    const { currentUser } = useAuth();
    const reviewerEmail = currentUser?.email || 'System User'; // Reviewer ka email

    // 💡 useFirestore hook
    const { 
        data: allLeaves, 
        loading: loadingData, 
        error: dataError,
        updateDocument 
    } = useFirestore('leaves'); 

    // Filtered list: Sirf "Pending" requests dikhao
    const pendingLeaves = allLeaves 
        ? allLeaves.filter(leave => leave.status === 'Pending') 
        : [];

    // 💡 Status update karne ka function
    const handleAction = async (leaveId, actionStatus) => {
        setMessage('');
        
        try {
            await updateDocument(leaveId, { 
                status: actionStatus,
                reviewedBy: reviewerEmail, 
                reviewedAt: new Date()
            });
            
            setMessage(`Success! Request ${leaveId} has been ${actionStatus}. List will auto-update.`);
            
        } catch (error) {
            setMessage(`Error updating status: ${error.message}`);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
               
                <main style={{ padding: '20px', backgroundColor: '#f4f7f9', flexGrow: 1 }}>
                    <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', color: '#dc3545' }}>
                        Leave Request Approval ({pendingLeaves.length} Pending)
                    </h2>
                    
                    {/* Messaging Area */}
                    {message && <p style={{ color: message.startsWith('Error') ? 'red' : 'green', fontWeight: 'bold' }}>{message}</p>}
                    {loadingData && <LoadingSpinner message="Fetching pending requests..." size="40px" />}
                    {dataError && <p style={{ color: 'red' }}>Error loading data: {dataError}</p>}
                    
                    {/* Requests List */}
                    {!loadingData && pendingLeaves.length === 0 && !dataError && (
                        <p style={{ padding: '20px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>No pending leave requests found. Chill maro! 😎</p>
                    )}

                    {!loadingData && pendingLeaves.length > 0 && (
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #333' }}>
                                        <th style={tableHeaderStyle}>Employee</th>
                                        <th style={tableHeaderStyle}>Type</th>
                                        <th style={tableHeaderStyle}>Duration</th>
                                        <th style={tableHeaderStyle}>Reason</th>
                                        <th style={tableHeaderStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingLeaves.map(leave => (
                                        <tr key={leave.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={tableCellStyle}>{leave.userName}</td>
                                            <td style={tableCellStyle}>{leave.leaveType}</td>
                                            <td style={tableCellStyle}>{leave.startDate} to {leave.endDate}</td>
                                            <td style={{ ...tableCellStyle, fontSize: '0.9em' }}>{leave.reason.substring(0, 50)}...</td>
                                            <td style={tableCellStyle}>
                                                <button 
                                                    onClick={() => handleAction(leave.id, 'Approved')}
                                                    style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}
                                                >
                                                    Approve
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(leave.id, 'Rejected')}
                                                    style={{ ...actionButtonStyle, backgroundColor: '#ffc107', marginLeft: '10px' }}
                                                >
                                                    Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

// Internal Styles (remains the same)
const tableHeaderStyle = { textAlign: 'left', padding: '12px 10px', backgroundColor: '#f8f9fa' };
const tableCellStyle = { padding: '10px', borderRight: '1px solid #f4f4f4' };
const actionButtonStyle = { color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' };

export default LeaveRequests;