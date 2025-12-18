// src/pages/hr/MonthlyAttendanceReport.jsx (WITH CSV EXPORT)

import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function MonthlyAttendanceReport() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format

    // 1. Fetch Employees List (For Dropdown)
    const employeeFilters = useMemo(() => [['role', '==', 'employee']], []);
    const { data: employees } = useFirestore('users', employeeFilters);

    // 2. Fetch Attendance Records (Filtered by Employee)
    const attendanceFilters = useMemo(() => 
        selectedEmployeeId ? [['employeeUid', '==', selectedEmployeeId]] : null, 
    [selectedEmployeeId]);
    
    const { data: allRecords, loading } = useFirestore('attendance', attendanceFilters);

    // 3. Filter Records by Selected Month & Calculate Stats
    const reportData = useMemo(() => {
        if (!allRecords || !selectedMonth) return { days: [], stats: {} };

        // Filter for selected month
        const monthRecords = allRecords.filter(record => record.date.startsWith(selectedMonth));

        // Calculate Stats
        const stats = {
            present: monthRecords.filter(r => r.status === 'Present').length,
            absent: monthRecords.filter(r => r.status === 'Absent').length,
            leave: monthRecords.filter(r => r.status === 'Leave').length,
            late: monthRecords.filter(r => r.status === 'Late').length,
            halfDay: monthRecords.filter(r => r.status === 'Half Day').length,
            total: monthRecords.length
        };

        // Sort by Date
        const sortedDays = monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

        return { days: sortedDays, stats };
    }, [allRecords, selectedMonth]);

    // 🌟 4. CSV EXPORT FUNCTION (New Addition)
    const exportToCSV = () => {
        if (!reportData.days.length) {
            alert("No data to export!");
            return;
        }

        // Employee Name dhoondo filename ke liye
        const empName = employees?.find(e => e.uid === selectedEmployeeId)?.name || 'Employee';
        
        // CSV Headers define karo
        const headers = ["Date", "Day", "In Time", "Out Time", "Status"];

        // Data ko rows me convert karo
        const rows = reportData.days.map(record => {
            const dayName = new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' });
            return [
                record.date,
                dayName,
                record.timeIn || '-',
                record.timeOut || '-',
                record.status
            ];
        });

        // Headers aur Rows ko join karke CSV string banao
        const csvContent = [
            headers.join(','), // Header Row
            ...rows.map(row => row.join(',')) // Data Rows
        ].join('\n');

        // Download trigger karo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_${empName}_${selectedMonth}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header with Title and Download Button */}
            <div className="flex justify-between items-center mb-6 border-b pb-2">
                <h2 className="text-2xl font-bold text-gray-800">Monthly Attendance Report</h2>
                
                {/* 🌟 Button tabhi dikhega jab data hoga */}
                {reportData.days.length > 0 && (
                    <button 
                        onClick={exportToCSV}
                        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition flex items-center gap-2 font-semibold"
                    >
                        📥 Download CSV
                    </button>
                )}
            </div>

            {/* Controls Section */}
            <div className="flex flex-wrap gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm">
                
                {/* Employee Selector */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                    <select 
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="" disabled>-- Choose an Employee --</option>
                        {employees?.map(emp => (
                            <option key={emp.uid} value={emp.uid}>
                                {emp.name} ({emp.empId || 'N/A'})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Month Selector */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Report Content */}
            {selectedEmployeeId ? (
                loading ? (
                    <LoadingSpinner message="Generating Report..." />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left: Summary Card */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                                <h3 className="text-lg font-bold text-gray-700 mb-4">Summary</h3>
                                <div className="space-y-3">
                                    <StatRow label="Present" value={reportData.stats.present} color="text-green-600" />
                                    <StatRow label="Absent" value={reportData.stats.absent} color="text-red-600" />
                                    <StatRow label="Late" value={reportData.stats.late} color="text-orange-500" />
                                    <StatRow label="On Leave" value={reportData.stats.leave} color="text-blue-500" />
                                    <StatRow label="Half Day" value={reportData.stats.halfDay} color="text-purple-500" />
                                    <div className="pt-3 border-t border-gray-200 flex justify-between font-bold">
                                        <span>Total Days Recorded</span>
                                        <span>{reportData.stats.total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Detailed Table */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-100 border-b">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-600">Date</th>
                                            <th className="p-3 font-semibold text-gray-600">Day</th>
                                            <th className="p-3 font-semibold text-gray-600">In Time</th>
                                            <th className="p-3 font-semibold text-gray-600">Out Time</th>
                                            <th className="p-3 font-semibold text-gray-600">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.days.length > 0 ? (
                                            reportData.days.map((record) => (
                                                <tr key={record.id} className="border-b hover:bg-gray-50">
                                                    <td className="p-3">{record.date}</td>
                                                    <td className="p-3 text-gray-500 text-sm">
                                                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                    </td>
                                                    <td className="p-3 font-mono text-sm">{record.timeIn || '-'}</td>
                                                    <td className="p-3 font-mono text-sm">{record.timeOut || '-'}</td>
                                                    <td className="p-3">
                                                        <StatusBadge status={record.status} />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-gray-500">
                                                    No attendance records found for this month.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-gray-300 text-gray-500">
                    👆 Select an Employee to view their Monthly Report
                </div>
            )}
        </div>
    );
}

// UI Components
const StatRow = ({ label, value, color }) => (
    <div className="flex justify-between items-center">
        <span className="text-gray-600">{label}</span>
        <span className={`font-bold text-lg ${color}`}>{value}</span>
    </div>
);

const StatusBadge = ({ status }) => {
    const colors = {
        'Present': 'bg-green-100 text-green-800',
        'Absent': 'bg-red-100 text-red-800',
        'Late': 'bg-orange-100 text-orange-800',
        'Leave': 'bg-blue-100 text-blue-800',
        'Half Day': 'bg-purple-100 text-purple-800'
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status] || 'bg-gray-100'}`}>
            {status}
        </span>
    );
};

export default MonthlyAttendanceReport;