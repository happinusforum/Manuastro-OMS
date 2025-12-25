// src/pages/hr/YearlyPayoffReport.jsx

import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function YearlyPayoffReport() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    // 1. Employees Fetch (SORTED LOGIC)
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

    // 2. Payroll Records Fetch
    const payrollFilters = useMemo(() => 
        selectedEmployeeId ? [['employeeId', '==', selectedEmployeeId]] : null, 
    [selectedEmployeeId]);
    
    const { data: allRecords, loading } = useFirestore('payroll', payrollFilters);

    // 3. Process Logic (UNCHANGED)
    const yearlyData = useMemo(() => {
        if (!allRecords || !selectedYear) return [];

        const filtered = allRecords.filter(rec => rec.month.startsWith(selectedYear));
        return filtered.sort((a, b) => a.month.localeCompare(b.month));
    }, [allRecords, selectedYear]);

    // 4. Calculate Total Yearly Stats (UNCHANGED)
    const totalStats = useMemo(() => {
        return yearlyData.reduce((acc, curr) => ({
            totalNet: acc.totalNet + parseFloat(curr.netSalary || 0),
            totalAdvance: acc.totalAdvance + parseFloat(curr.advanceSalary || 0),
            totalImprest: acc.totalImprest + parseFloat(curr.imprest || 0)
        }), { totalNet: 0, totalAdvance: 0, totalImprest: 0 });
    }, [yearlyData]);

    // 5. Export to CSV (UNCHANGED)
    const exportToCSV = () => {
        if (!yearlyData.length) return alert("No data!");
        
        const empName = employees?.find(e => e.uid === selectedEmployeeId)?.name || 'Employee';
        const headers = ["Month", "Basic Salary", "Working Days", "Paid Leaves", "Unpaid Leaves", "Imprest", "Advance", "Net Salary"];
        
        const rows = yearlyData.map(rec => [
            rec.month, rec.basicSalary, rec.totalWorkingDays, rec.paidLeaves, rec.unpaidLeaves, rec.imprest, rec.advanceSalary, rec.netSalary
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `Payoff_${empName}_${selectedYear}.csv`;
        link.click();
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Annual Payoff Report</h2>
                    <p className="text-sm text-gray-500 mt-1">View cumulative salary data for the selected year.</p>
                </div>
                
                {yearlyData.length > 0 && (
                    <button 
                        onClick={exportToCSV}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 font-medium active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download CSV
                    </button>
                )}
            </div>

            {/* --- FILTERS TOOLBAR --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-6 items-end">
                
                {/* Employee Selector */}
                <div className="w-full md:w-1/3">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Employee</label>
                    <div className="relative">
                        <select 
                            value={selectedEmployeeId} 
                            onChange={(e) => setSelectedEmployeeId(e.target.value)} 
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">-- Choose (Sorted by ID) --</option>
                            {employees?.map(emp => (
                                <option key={emp.uid} value={emp.uid}>
                                    {emp.name} ({emp.empId})
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">▼</div>
                    </div>
                </div>

                {/* Year Input */}
                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Financial Year</label>
                    <input 
                        type="number" 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="YYYY"
                    />
                </div>
            </div>

            {/* --- REPORT CONTENT --- */}
            {selectedEmployeeId ? (
                loading ? <div className="py-20"><LoadingSpinner message="Calculating financials..." size="40px" /></div> : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {/* Total Net */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Net Paid</p>
                                    <h3 className="text-2xl font-bold text-blue-600 mt-1">
                                        ₹{totalStats.totalNet.toLocaleString()}
                                    </h3>
                                </div>
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                            </div>

                            {/* Total Deductions (Advance) */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Advances</p>
                                    <h3 className="text-2xl font-bold text-red-600 mt-1">
                                        ₹{totalStats.totalAdvance.toLocaleString()}
                                    </h3>
                                </div>
                                <div className="p-3 bg-red-50 text-red-600 rounded-full">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                </div>
                            </div>

                            {/* Total Imprest */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Imprest</p>
                                    <h3 className="text-2xl font-bold text-orange-600 mt-1">
                                        ₹{totalStats.totalImprest.toLocaleString()}
                                    </h3>
                                </div>
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            {["Month", "Basic", "Work Days", "Unpaid Leaves", "Imprest", "Advance", "Net Salary"].map(h => (
                                                <th key={h} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {yearlyData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center text-gray-400 italic">
                                                    No payroll records found for {selectedYear}
                                                </td>
                                            </tr>
                                        ) : (
                                            yearlyData.map((rec) => (
                                                <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-800">{rec.month}</td>
                                                    <td className="px-6 py-4 text-gray-600">₹{parseFloat(rec.basicSalary).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-gray-600">{rec.totalWorkingDays}</td>
                                                    <td className="px-6 py-4 text-red-500 font-medium">{rec.unpaidLeaves}</td>
                                                    <td className="px-6 py-4 text-orange-500">₹{rec.imprest}</td>
                                                    <td className="px-6 py-4 text-orange-500">₹{rec.advanceSalary}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                                            ₹{parseFloat(rec.netSalary).toLocaleString()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <span className="text-4xl mb-4">👆</span>
                    <h3 className="text-lg font-bold text-gray-700">Select an Employee</h3>
                    <p className="text-gray-500">Select an employee from the dropdown to generate their annual report.</p>
                </div>
            )}
        </div>
    );
}

export default YearlyPayoffReport;