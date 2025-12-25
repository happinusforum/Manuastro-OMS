// src/pages/hr/MonthlyAttendanceReport.jsx

import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function MonthlyAttendanceReport() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // 1. Fetch Employees (For Dropdown)
    const employeeFilters = useMemo(() => [['role', '==', 'employee']], []);
    const { data: employees } = useFirestore('users', employeeFilters);

    // 2. Fetch Attendance (Filtered by Employee)
    const attendanceFilters = useMemo(() => 
        selectedEmployeeId ? [['employeeUid', '==', selectedEmployeeId]] : null, 
    [selectedEmployeeId]);
    
    const { data: allRecords, loading } = useFirestore('attendance', attendanceFilters);

    // 3. Filter & Calculate Stats (UNCHANGED)
    const reportData = useMemo(() => {
        if (!allRecords || !selectedMonth) return { days: [], stats: {} };

        // Filter for month
        const monthRecords = allRecords.filter(record => record.date.startsWith(selectedMonth));

        // Stats
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

    // 🌟 4. CSV Export Logic (UNCHANGED)
    const exportToCSV = () => {
        if (!reportData.days.length) {
            alert("No data to export!");
            return;
        }

        const empName = employees?.find(e => e.uid === selectedEmployeeId)?.name || 'Employee';
        const headers = ["Date", "Day", "In Time", "Out Time", "Status"];

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

        const csvContent = [
            headers.join(','), 
            ...rows.map(row => row.join(','))
        ].join('\n');

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
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Monthly Reports</h2>
                    <p className="text-sm text-gray-500 mt-1">Generate and export detailed attendance logs.</p>
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
                    <div className="py-20"><LoadingSpinner message="Generating Report..." size="40px" /></div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT: SUMMARY CARD (Sticky) */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    📊 Monthly Summary
                                </h3>
                                
                                <div className="space-y-4">
                                    <StatRow label="Present" value={reportData.stats.present} icon="✅" color="text-green-600" bg="bg-green-50" />
                                    <StatRow label="Absent" value={reportData.stats.absent} icon="❌" color="text-red-600" bg="bg-red-50" />
                                    <StatRow label="Late" value={reportData.stats.late} icon="⏰" color="text-orange-600" bg="bg-orange-50" />
                                    <StatRow label="Leaves" value={reportData.stats.leave} icon="🏖️" color="text-blue-600" bg="bg-blue-50" />
                                    <StatRow label="Half Days" value={reportData.stats.halfDay} icon="🌗" color="text-purple-600" bg="bg-purple-50" />
                                    
                                    <div className="pt-4 mt-2 border-t border-gray-100 flex justify-between items-center">
                                        <span className="font-bold text-gray-700">Total Days Logged</span>
                                        <span className="font-mono font-bold text-lg text-gray-900">{reportData.stats.total}</span>
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
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Time In</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Time Out</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {reportData.days.length > 0 ? (
                                                reportData.days.map((record) => (
                                                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-800">{record.date}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-sm text-gray-600">{record.timeIn || '-'}</td>
                                                        <td className="px-6 py-4 font-mono text-sm text-gray-600">{record.timeOut || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge status={record.status} />
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="p-12 text-center text-gray-400 italic">
                                                        No attendance records found for this period.
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
                    <p className="text-gray-500">Choose an employee from the list above to view their monthly report.</p>
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
        <span className={`font-bold text-lg ${color}`}>{value}</span>
    </div>
);

const StatusBadge = ({ status }) => {
    const colors = {
        'Present': 'bg-green-100 text-green-700 border-green-200',
        'Absent': 'bg-red-100 text-red-700 border-red-200',
        'Late': 'bg-orange-100 text-orange-700 border-orange-200',
        'Leave': 'bg-blue-100 text-blue-700 border-blue-200',
        'Half Day': 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {status}
        </span>
    );
};

export default MonthlyAttendanceReport;