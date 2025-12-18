// src/pages/hr/AttendanceRecords.jsx (With Link to Monthly Report)

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // ⬅️ IMPORT 1: Navigation ke liye
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function AttendanceRecords() {
    const navigate = useNavigate(); // ⬅️ HOOK 1: Navigate function

    // 📅 1. Date Selection State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
    const [loadingUpdate, setLoadingUpdate] = useState(null); 

    // 👥 2. Fetch All Employees
    const employeeFilters = useMemo(() => [['role', '==', 'employee']], []);
    const { 
        data: employees, 
        loading: loadingEmployees 
    } = useFirestore('users', employeeFilters);

    // 📝 3. Fetch Attendance for Selected Date
    const attendanceFilters = useMemo(() => [['date', '==', selectedDate]], [selectedDate]);
    const { 
        data: attendanceRecords, 
        loading: loadingAttendance, 
        addDocument, 
        updateDocument 
    } = useFirestore('attendance', attendanceFilters);

    // 🔄 4. Data Merging Logic
    const attendanceSheet = useMemo(() => {
        if (!employees) return [];
        
        return employees.map(emp => {
            const record = attendanceRecords?.find(r => r.employeeUid === emp.uid);
            return {
                ...emp, 
                attendanceId: record?.id || null, 
                currentStatus: record?.status || 'Not Marked', 
                timeIn: record?.timeIn || '',
                timeOut: record?.timeOut || ''
            };
        });
    }, [employees, attendanceRecords]);


    // ⚡ 5. Handle Status Change
    const handleStatusChange = async (employee, newStatus) => {
        setLoadingUpdate(employee.uid); 

        try {
            if (employee.attendanceId) {
                // Update existing
                await updateDocument(employee.attendanceId, { 
                    status: newStatus,
                    timestamp: new Date()
                });
            } else {
                // Create new
                await addDocument({
                    employeeUid: employee.uid,
                    employeeId: employee.empId || 'N/A', 
                    name: employee.name,
                    date: selectedDate,
                    status: newStatus,
                    timeIn: '09:00',
                    timeOut: '18:00',
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error("Error marking attendance:", error);
            alert("Failed to update status. Check console.");
        } finally {
            setLoadingUpdate(null);
        }
    };

    // --- RENDER ---
    return (
        <div className="p-5 bg-gray-50 flex-1 h-full overflow-y-auto">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-200 pb-4 mb-5 gap-4">
                
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-blue-600">Daily Attendance Sheet</h2>
                    
                    {/* 🌟 NEW BUTTON: Go to Monthly Report */}
                    <button 
                        onClick={() => navigate('/hr/monthly-report')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow hover:bg-indigo-700 transition text-sm flex items-center gap-2"
                    >
                        📊 View Monthly Report
                    </button>
                </div>
                
                {/* Date Picker */}
                <div className="flex items-center gap-3 bg-white p-2 rounded border border-gray-300">
                    <span className="font-semibold text-gray-700">Date:</span>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        className="outline-none text-gray-700 font-medium cursor-pointer"
                    />
                </div>
            </div>

            {/* Loading State */}
            {(loadingEmployees || loadingAttendance) && !attendanceRecords ? (
                <LoadingSpinner message="Loading Sheet..." size="40px" />
            ) : (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-100 border-b border-gray-300">
                            <tr>
                                <th className="text-left p-4 font-semibold text-gray-700">Employee Details</th>
                                <th className="text-left p-4 font-semibold text-gray-700">Emp ID</th>
                                <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                                <th className="text-left p-4 font-semibold text-gray-700">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceSheet.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-5 text-center text-gray-500">No employees found.</td>
                                </tr>
                            ) : (
                                attendanceSheet.map((emp) => (
                                    <tr key={emp.uid} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                        
                                        {/* Name & Role */}
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{emp.name || emp.email}</div>
                                            <div className="text-xs text-gray-500">{emp.role?.toUpperCase()}</div>
                                        </td>

                                        {/* Employee ID */}
                                        <td className="p-4">
                                            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-mono">
                                                {emp.empId || 'N/A'}
                                            </span>
                                        </td>

                                        {/* Live Status Badge */}
                                        <td className="p-4">
                                            <span 
                                                className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                    emp.currentStatus === 'Present' ? 'bg-green-100 text-green-800' :
                                                    emp.currentStatus === 'Absent' ? 'bg-red-100 text-red-800' :
                                                    emp.currentStatus === 'Leave' ? 'bg-yellow-100 text-yellow-800' :
                                                    emp.currentStatus === 'Late' ? 'bg-orange-100 text-orange-800' :
                                                    emp.currentStatus === 'Half Day' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {emp.currentStatus}
                                            </span>
                                        </td>

                                        {/* Action (CRUD Dropdown) */}
                                        <td className="p-4">
                                            {loadingUpdate === emp.uid ? (
                                                <span className="text-sm text-blue-500 font-medium">Saving...</span>
                                            ) : (
                                                <select 
                                                    value={emp.currentStatus}
                                                    onChange={(e) => handleStatusChange(emp, e.target.value)}
                                                    className="p-2 border border-gray-300 rounded cursor-pointer focus:outline-none focus:border-blue-500 text-sm"
                                                    disabled={emp.role === 'admin'} 
                                                >
                                                    <option value="Not Marked" disabled>Select</option>
                                                    <option value="Present">✅ Present</option>
                                                    <option value="Absent">❌ Absent</option>
                                                    <option value="Late">⏰ Late</option>
                                                    <option value="Leave">✈️ On Leave</option>
                                                    <option value="Half Day">🌗 Half Day</option>
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AttendanceRecords;