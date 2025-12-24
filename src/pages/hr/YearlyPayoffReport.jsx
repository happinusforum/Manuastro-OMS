// src/pages/hr/YearlyPayoffReport.jsx (FINAL: SORTED DROPDOWN)

import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function YearlyPayoffReport() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    // 1. Employees Fetch (SORTED LOGIC ADDED HERE)
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

    // 2. Payroll Records Fetch (Filter by Employee)
    const payrollFilters = useMemo(() => 
        selectedEmployeeId ? [['employeeId', '==', selectedEmployeeId]] : null, 
    [selectedEmployeeId]);
    
    const { data: allRecords, loading } = useFirestore('payroll', payrollFilters);

    // 3. Process Logic: Year Filter & Sorting
    const yearlyData = useMemo(() => {
        if (!allRecords || !selectedYear) return [];

        const filtered = allRecords.filter(rec => rec.month.startsWith(selectedYear));
        return filtered.sort((a, b) => a.month.localeCompare(b.month));
    }, [allRecords, selectedYear]);

    // 4. Calculate Total Yearly Stats
    const totalStats = useMemo(() => {
        return yearlyData.reduce((acc, curr) => ({
            totalNet: acc.totalNet + parseFloat(curr.netSalary || 0),
            totalAdvance: acc.totalAdvance + parseFloat(curr.advanceSalary || 0),
            totalImprest: acc.totalImprest + parseFloat(curr.imprest || 0)
        }), { totalNet: 0, totalAdvance: 0, totalImprest: 0 });
    }, [yearlyData]);

    // 5. Export to CSV
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
        link.href = URL.createObjectURL(blob);
        link.download = `Payoff_${empName}_${selectedYear}.csv`;
        link.click();
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6 border-b pb-2">
                <h2 className="text-2xl font-bold text-gray-800">Yearly Payoff Report</h2>
                {yearlyData.length > 0 && (
                    <button onClick={exportToCSV} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-bold">
                        📥 Download CSV
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-4 mb-6 bg-white p-4 rounded shadow-sm">
                <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-600">Select Employee</label>
                    <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="w-full p-2 border rounded">
                        <option value="">-- Choose (Sorted by ID) --</option>
                        {employees?.map(emp => <option key={emp.uid} value={emp.uid}>{emp.name} ({emp.empId})</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-600">Select Year</label>
                    <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full p-2 border rounded" />
                </div>
            </div>

            {/* Report Table */}
            {selectedEmployeeId ? (
                loading ? <LoadingSpinner /> : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-100 p-4 rounded text-center"><h4 className="text-blue-800 font-bold">Total Net Pay</h4><p className="text-2xl font-bold text-blue-900">₹{totalStats.totalNet.toLocaleString()}</p></div>
                            <div className="bg-red-100 p-4 rounded text-center"><h4 className="text-red-800 font-bold">Total Advance</h4><p className="text-2xl font-bold text-red-900">₹{totalStats.totalAdvance.toLocaleString()}</p></div>
                            <div className="bg-yellow-100 p-4 rounded text-center"><h4 className="text-yellow-800 font-bold">Total Imprest</h4><p className="text-2xl font-bold text-yellow-900">₹{totalStats.totalImprest.toLocaleString()}</p></div>
                        </div>

                        <div className="bg-white rounded shadow overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 border-b">
                                    <tr>
                                        <th className="p-3">Month</th><th className="p-3">Basic</th><th className="p-3">Work Days</th><th className="p-3">Unpaid L.</th><th className="p-3">Imprest</th><th className="p-3">Advance</th><th className="p-3">Net Salary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {yearlyData.length === 0 ? (
                                        <tr><td colSpan="7" className="p-5 text-center text-gray-500">No records found for {selectedYear}</td></tr>
                                    ) : (
                                        yearlyData.map(rec => (
                                            <tr key={rec.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium">{rec.month}</td>
                                                <td className="p-3">₹{rec.basicSalary}</td>
                                                <td className="p-3">{rec.totalWorkingDays}</td>
                                                <td className="p-3 text-red-500">{rec.unpaidLeaves}</td>
                                                <td className="p-3 text-orange-500">{rec.imprest}</td>
                                                <td className="p-3 text-orange-500">{rec.advanceSalary}</td>
                                                <td className="p-3 font-bold text-green-700">₹{rec.netSalary}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )
            ) : (
                <div className="text-center py-20 bg-white rounded border-dashed border-2 text-gray-500">Select an Employee</div>
            )}
        </div>
    );
}

export default YearlyPayoffReport;