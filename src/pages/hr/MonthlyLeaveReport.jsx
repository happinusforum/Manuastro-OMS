// src/pages/hr/MonthlyLeaveReport.jsx

import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function MonthlyLeaveReport() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // 1. Fetch Employees (SORTED LOGIC)
    const employeeFilters = useMemo(() => [['role', '==', 'employee']], []);
    const { data: rawEmployees } = useFirestore('users', employeeFilters);

    // 🔥 SORTED EMPLOYEES LIST (UNCHANGED)
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

    // 3. 🧠 SMART LOGIC: Process Data & Expand Date Ranges (UNCHANGED)
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
                    // Normalize type string to match stats keys (e.g., "Sick Leave" -> "Sick")
                    const typeKey = leave.leaveType.split(' ')[0]; 

                    processedDays.push({
                        date: dateStr,
                        type: leave.leaveType,
                        reason: leave.reason,
                        status: leave.status
                    });

                    if (stats[typeKey] !== undefined) stats[typeKey]++;
                    else {
                        // Fallback if type doesn't match standard keys
                        stats[typeKey] = (stats[typeKey] || 0) + 1;
                    }
                    stats.Total++;
                }
                current.setDate(current.getDate() + 1);
            }
        });

        // Sort by Date
        processedDays.sort((a, b) => new Date(a.date) - new Date(b.date));

        return { days: processedDays, stats };

    }, [allLeaves, selectedMonth]);

    // 4. CSV Export Function (UNCHANGED)
    const exportToCSV = () => {
        if (!reportData.days.length) {
            alert("No data to export!");
            return;
        }

        const empName = employees?.find(e => e.uid === selectedEmployeeId)?.name || 'Employee';
        const headers = ["Date", "Day", "Leave Type", "Reason", "Status"];

        const rows = reportData.days.map(record => {
            const dayName = new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' });
            return [
                record.date, 
                dayName, 
                record.type, 
                `"${record.reason.replace(/"/g, '""')}"`, // Escape quotes
                record.status
            ];
        });

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Leaves_${empName}_${selectedMonth}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Leave Reports</h2>
                    <p className="text-sm text-gray-500 mt-1">Detailed monthly leave analysis and export.</p>
                </div>
                
                {reportData.days.length > 0 && (
                    <button 
                        onClick={exportToCSV}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 font-medium active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export CSV
                    </button>
                )}
            </div>

            {/* --- FILTERS TOOLBAR --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4 items-end">
                
                {/* Employee Selector */}
                <div className="w-full md:w-1/3">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Employee</label>
                    <div className="relative">
                        <select 
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="" disabled>-- Choose Employee --</option>
                            {employees?.map(emp => (
                                <option key={emp.uid} value={emp.uid}>
                                    {emp.name} ({emp.empId || 'N/A'})
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">▼</div>
                    </div>
                </div>

                {/* Month Selector */}
                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Month</label>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* --- REPORT CONTENT --- */}
            {selectedEmployeeId ? (
                loading ? (
                    <div className="py-20"><LoadingSpinner message="Analysing Leaves..." size="40px" /></div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT: SUMMARY CARD (Sticky) */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    📊 Leave Summary
                                </h3>
                                
                                <div className="space-y-4">
                                    <StatRow label="Sick Leave" value={reportData.stats.Sick} icon="🤒" color="text-red-600" bg="bg-red-50" />
                                    <StatRow label="Casual Leave" value={reportData.stats.Casual} icon="🏠" color="text-yellow-600" bg="bg-yellow-50" />
                                    <StatRow label="Earned Leave" value={reportData.stats.Earned} icon="🌴" color="text-green-600" bg="bg-green-50" />
                                    <StatRow label="Unpaid Leave" value={reportData.stats.Unpaid} icon="💸" color="text-gray-600" bg="bg-gray-50" />
                                    
                                    <div className="pt-4 mt-2 border-t border-gray-100 flex justify-between items-center">
                                        <span className="font-bold text-gray-700">Total Days Off</span>
                                        <span className="font-mono font-bold text-lg text-gray-900">{reportData.stats.Total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: DETAILED TABLE */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full whitespace-nowrap text-left">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Day</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Type</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Reason</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {reportData.days.length > 0 ? (
                                                reportData.days.map((record, index) => (
                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-800">{record.date}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <TypeBadge type={record.type} />
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-[150px]" title={record.reason}>
                                                            {record.reason}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">Approved</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="p-12 text-center text-gray-400 italic">
                                                        No approved leaves found in this month.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <span className="text-4xl mb-4">👆</span>
                    <h3 className="text-lg font-bold text-gray-700">Select an Employee</h3>
                    <p className="text-gray-500">Choose an employee to view their detailed leave breakdown.</p>
                </div>
            )}
        </div>
    );
}

// 🧱 UI Components
const StatRow = ({ label, value, icon, color, bg }) => (
    <div className={`flex justify-between items-center p-3 rounded-lg ${bg}`}>
        <div className="flex items-center gap-3">
            <span>{icon}</span>
            <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className={`font-bold text-lg ${color}`}>{value || 0}</span>
    </div>
);

const TypeBadge = ({ type }) => {
    // Extract base type e.g., "Sick Leave" -> "Sick"
    const baseType = type ? type.split(' ')[0] : 'Unknown';
    const colors = {
        'Sick': 'bg-red-100 text-red-700 border-red-200',
        'Casual': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'Annual': 'bg-blue-100 text-blue-700 border-blue-200',
        'Earned': 'bg-green-100 text-green-700 border-green-200',
        'Unpaid': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors[baseType] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {type}
        </span>
    );
};

export default MonthlyLeaveReport;