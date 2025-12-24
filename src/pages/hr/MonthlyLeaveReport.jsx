// src/pages/hr/MonthlyLeaveReport.jsx (FINAL: SORTED DROPDOWN)

import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function MonthlyLeaveReport() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // 1. Fetch Employees (SORTED LOGIC ADDED HERE)
    const employeeFilters = useMemo(() => [['role', '==', 'employee']], []);
    const { data: rawEmployees } = useFirestore('users', employeeFilters);

    // 🔥 SORTED EMPLOYEES LIST
    const employees = useMemo(() => {
        if (!rawEmployees) return [];
        return [...rawEmployees].sort((a, b) => {
            const getNum = (id) => {
                if (!id) return 9999;
                const match = id.match(/\d+$/);
                return match ? parseInt(match[0], 10) : 9999;
            };
            return getNum(a.empId) - getNum(b.empId);
        });
    }, [rawEmployees]);

    // 2. Fetch Leaves for Selected Employee
    const leavesFilters = useMemo(() => 
        selectedEmployeeId ? [['userId', '==', selectedEmployeeId]] : null, 
    [selectedEmployeeId]);

    const { data: allLeaves, loading } = useFirestore('leaves', leavesFilters);

    // 3. 🧠 SMART LOGIC: Process Data & Expand Date Ranges
    const reportData = useMemo(() => {
        if (!allLeaves || !selectedMonth) return { days: [], stats: {} };

        const targetMonth = selectedMonth; 
        let processedDays = [];
        
        // Stats Counters
        let stats = { Sick: 0, Casual: 0, Earned: 0, Unpaid: 0, Total: 0 };

        // Filter APPROVED leaves only
        const approvedLeaves = allLeaves.filter(l => l.status === 'Approved');

        approvedLeaves.forEach(leave => {
            let current = new Date(leave.startDate);
            const end = new Date(leave.endDate);

            // Date Range Loop
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                
                // If date matches selected month
                if (dateStr.startsWith(targetMonth)) {
                    processedDays.push({
                        date: dateStr,
                        type: leave.type,
                        reason: leave.reason,
                        status: leave.status
                    });

                    if (stats[leave.type] !== undefined) stats[leave.type]++;
                    else stats[leave.type] = (stats[leave.type] || 0) + 1;
                    stats.Total++;
                }
                current.setDate(current.getDate() + 1);
            }
        });

        // Sort by Date
        processedDays.sort((a, b) => new Date(a.date) - new Date(b.date));

        return { days: processedDays, stats };

    }, [allLeaves, selectedMonth]);

    // 4. CSV Export Function
    const exportToCSV = () => {
        if (!reportData.days.length) return alert("No data to export!");

        const empName = employees?.find(e => e.uid === selectedEmployeeId)?.name || 'Employee';
        const headers = ["Date", "Day", "Leave Type", "Reason", "Status"];

        const rows = reportData.days.map(record => {
            const dayName = new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' });
            return [
                record.date, dayName, record.type, `"${record.reason}"`, record.status
            ];
        });

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Leaves_${empName}_${selectedMonth}.csv`;
        link.click();
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6 border-b pb-2">
                <h2 className="text-2xl font-bold text-gray-800">Monthly Leave Report</h2>
                {reportData.days.length > 0 && (
                    <button onClick={exportToCSV} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition font-bold flex items-center gap-2">
                        📥 Download CSV
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                    <select 
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="" disabled>-- Choose Employee (Sorted) --</option>
                        {employees?.map(emp => (
                            <option key={emp.uid} value={emp.uid}>{emp.name} ({emp.empId})</option>
                        ))}
                    </select>
                </div>
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
                loading ? <LoadingSpinner message="Calculating Leaves..." /> : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Summary Card */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                                <h3 className="text-lg font-bold text-gray-700 mb-4">Leave Summary</h3>
                                <div className="space-y-3">
                                    <StatRow label="Sick Leave" value={reportData.stats.Sick} color="text-red-600" />
                                    <StatRow label="Casual Leave" value={reportData.stats.Casual} color="text-yellow-600" />
                                    <StatRow label="Earned Leave" value={reportData.stats.Earned} color="text-green-600" />
                                    <StatRow label="Unpaid Leave" value={reportData.stats.Unpaid} color="text-gray-600" />
                                    <div className="pt-3 border-t border-gray-200 flex justify-between font-bold text-lg">
                                        <span>Total Days Off</span>
                                        <span>{reportData.stats.Total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Table */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-100 border-b">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-600">Date</th>
                                            <th className="p-3 font-semibold text-gray-600">Day</th>
                                            <th className="p-3 font-semibold text-gray-600">Type</th>
                                            <th className="p-3 font-semibold text-gray-600">Reason</th>
                                            <th className="p-3 font-semibold text-gray-600">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.days.length > 0 ? (
                                            reportData.days.map((record, index) => (
                                                <tr key={index} className="border-b hover:bg-gray-50">
                                                    <td className="p-3 text-sm">{record.date}</td>
                                                    <td className="p-3 text-gray-500 text-sm">
                                                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                    </td>
                                                    <td className="p-3"><TypeBadge type={record.type} /></td>
                                                    <td className="p-3 text-sm text-gray-600 truncate max-w-[150px]" title={record.reason}>{record.reason}</td>
                                                    <td className="p-3">
                                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">Approved</span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-gray-500">
                                                    No approved leaves found in this month.
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
                    👆 Select an Employee to view Leave Report
                </div>
            )}
        </div>
    );
}

// Sub Components
const StatRow = ({ label, value, color }) => (
    <div className="flex justify-between items-center">
        <span className="text-gray-600">{label}</span>
        <span className={`font-bold text-lg ${color}`}>{value || 0}</span>
    </div>
);

const TypeBadge = ({ type }) => {
    const colors = {
        'Sick': 'bg-red-100 text-red-800',
        'Casual': 'bg-yellow-100 text-yellow-800',
        'Earned': 'bg-green-100 text-green-800',
        'Unpaid': 'bg-gray-100 text-gray-800'
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[type] || 'bg-blue-100 text-blue-800'}`}>
            {type}
        </span>
    );
};

export default MonthlyLeaveReport;