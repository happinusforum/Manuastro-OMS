// src/pages/hr/AttendanceRecords.jsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function AttendanceRecords() {
    const navigate = useNavigate();

    // 📅 1. Date Selection State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
    const [loadingUpdate, setLoadingUpdate] = useState(null); 

    // 👥 2. Fetch All Employees (UNCHANGED)
    const employeeFilters = useMemo(() => [['role', '==', 'employee']], []);
    const { data: employees, loading: loadingEmployees } = useFirestore('users', employeeFilters);

    // 📝 3. Fetch Attendance for Selected Date (UNCHANGED)
    const attendanceFilters = useMemo(() => [['date', '==', selectedDate]], [selectedDate]);
    const { data: attendanceRecords, loading: loadingAttendance, addDocument, updateDocument } = useFirestore('attendance', attendanceFilters);

    // 🔄 4. Data Merging & Sorting Logic (UNCHANGED)
    const attendanceSheet = useMemo(() => {
        if (!employees) return [];
        
        const mergedData = employees.map(emp => {
            const record = attendanceRecords?.find(r => r.employeeUid === emp.uid);
            return {
                ...emp, 
                attendanceId: record?.id || null, 
                currentStatus: record?.status || 'Not Marked', 
                reason: record?.reason || '' 
            };
        });

        // 🔥 SORTING LOGIC: Extract Number from EmpID
        return mergedData.sort((a, b) => {
            const getNum = (id) => {
                if (!id) return 9999;
                const match = id.match(/\d+$/);
                return match ? parseInt(match[0], 10) : 9999;
            };
            return getNum(a.empId) - getNum(b.empId);
        });

    }, [employees, attendanceRecords]);


    // ⚡ 5. Handle Status Change (UNCHANGED)
    const handleStatusChange = async (employee, newStatus) => {
        let reason = '';

        if (newStatus === 'Others') {
            const userReason = prompt("Please enter the reason for 'Others':");
            if (!userReason || userReason.trim() === '') {
                return; 
            }
            reason = userReason;
        }

        setLoadingUpdate(employee.uid); 

        try {
            const dataToSave = {
                status: newStatus,
                date: selectedDate,
                timestamp: new Date(),
                reason: reason
            };

            if (newStatus !== 'Others') {
                dataToSave.reason = ''; 
            }

            if (employee.attendanceId) {
                await updateDocument(employee.attendanceId, dataToSave);
            } else {
                await addDocument({
                    employeeUid: employee.uid,
                    employeeId: employee.empId || 'N/A', 
                    name: employee.name,
                    timeIn: '09:00',
                    timeOut: '18:00',
                    ...dataToSave
                });
            }
        } catch (error) {
            console.error("Error marking attendance:", error);
            alert("Failed to update status. Check console.");
        } finally {
            setLoadingUpdate(null);
        }
    };

    // 🎨 UI Helper: Status Badge Color
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Present': return 'bg-green-100 text-green-700 border-green-200';
            case 'Absent': return 'bg-red-100 text-red-700 border-red-200';
            case 'Late': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Half Day': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Leave': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Holiday': return 'bg-teal-100 text-teal-700 border-teal-200';
            case 'Others': return 'bg-gray-100 text-gray-700 border-gray-300';
            default: return 'bg-gray-50 text-gray-500 border-gray-200'; // Not Marked
        }
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Daily Attendance</h2>
                    <p className="text-sm text-gray-500 mt-1">Mark and track daily employee presence.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Date Picker */}
                    <div className="bg-white px-3 py-2 rounded-lg border border-gray-300 shadow-sm flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Date:</span>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)} 
                            className="outline-none text-sm font-semibold text-gray-700 bg-transparent cursor-pointer"
                        />
                    </div>

                    {/* Report Button */}
                    <button 
                        onClick={() => navigate('/hr/monthly-report')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <span>📊</span> Monthly Report
                    </button>
                </div>
            </div>

            {/* --- LOADING STATE --- */}
            {(loadingEmployees || loadingAttendance) && !attendanceRecords ? (
                <div className="p-12 flex justify-center">
                    <LoadingSpinner message="Loading Attendance Sheet..." size="40px" />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Emp ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Current Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {attendanceSheet.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-500">
                                            No employees found in the system.
                                        </td>
                                    </tr>
                                ) : (
                                    attendanceSheet.map((emp) => (
                                        <tr key={emp.uid} className="hover:bg-gray-50/80 transition-colors group">
                                            
                                            {/* Name Column */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar Initials */}
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                                        {(emp.name || emp.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-sm">{emp.name || emp.email}</div>
                                                        <div className="text-xs text-gray-500 font-medium">{emp.role?.toUpperCase()}</div>
                                                    </div>
                                                </div>
                                                {/* Reason Note (if any) */}
                                                {emp.currentStatus === 'Others' && emp.reason && (
                                                    <div className="mt-1 ml-12 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded w-fit border border-orange-100">
                                                        Note: {emp.reason}
                                                    </div>
                                                )}
                                            </td>

                                            {/* ID Column */}
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                    {emp.empId || 'N/A'}
                                                </span>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(emp.currentStatus)}`}>
                                                    {emp.currentStatus === 'Not Marked' ? '⏳ Not Marked' : emp.currentStatus}
                                                </span>
                                            </td>

                                            {/* Action Dropdown */}
                                            <td className="px-6 py-4">
                                                {loadingUpdate === emp.uid ? (
                                                    <div className="flex items-center gap-2 text-blue-600">
                                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                        <span className="text-xs font-bold">Saving...</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <select 
                                                            value={emp.currentStatus}
                                                            onChange={(e) => handleStatusChange(emp, e.target.value)}
                                                            disabled={emp.role === 'admin'} 
                                                            className={`block w-40 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-colors
                                                                ${emp.role === 'admin' ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:border-blue-400'}`}
                                                        >
                                                            <option value="Not Marked" disabled>Select Status</option>
                                                            <option value="Present">✅ Present</option>
                                                            <option value="Absent">❌ Absent</option>
                                                            <option value="Late">⏰ Late</option>
                                                            <option value="Half Day">🌗 Half Day</option>
                                                            <option value="Leave">✈️ On Leave</option>
                                                            <option value="Holiday">🌴 Holiday</option>
                                                            <option value="Others">📝 Others...</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AttendanceRecords;