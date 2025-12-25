// src/pages/hr/PayrollManagement.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const initialFormState = {
    employeeId: '',
    employeeName: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    basicSalary: 0,
    totalWorkingDays: 30,
    activeWorkingDays: 0, 
    paidLeaves: 0,
    unpaidLeaves: 0,
    imprest: 0, 
    advanceSalary: 0,
    netSalary: 0, 
    status: 'Processed'
};

function PayrollManagement() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState(initialFormState);
    const [editingId, setEditingId] = useState(null);
    const [loadingForm, setLoadingForm] = useState(false);

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

    // 2. Fetch Payroll Records
    const { 
        data: payrollRecords, 
        loading: loadingData, 
        addDocument, 
        updateDocument, 
        deleteDocument 
    } = useFirestore('payroll');

    // 🧠 AUTO CALCULATION LOGIC (UNCHANGED)
    useEffect(() => {
        const basic = parseFloat(formData.basicSalary) || 0;
        const totalDays = parseFloat(formData.totalWorkingDays) || 30;
        const unpaid = parseFloat(formData.unpaidLeaves) || 0;
        const imprest = parseFloat(formData.imprest) || 0;
        const advance = parseFloat(formData.advanceSalary) || 0;

        const perDaySalary = totalDays > 0 ? basic / totalDays : 0;
        const leaveDeduction = perDaySalary * unpaid;
        const activeDays = totalDays - unpaid;
        const net = basic - leaveDeduction - imprest - advance;

        setFormData(prev => ({
            ...prev,
            activeWorkingDays: activeDays,
            netSalary: Math.round(net)
        }));
    }, [formData.basicSalary, formData.totalWorkingDays, formData.unpaidLeaves, formData.imprest, formData.advanceSalary]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'employeeId') {
            const emp = employees.find(e => e.uid === value);
            if (emp) {
                setFormData(prev => ({ ...prev, employeeName: emp.name, employeeId: value }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoadingForm(true);
        try {
            if (editingId) {
                await updateDocument(editingId, formData);
                alert("Payroll Updated!");
            } else {
                await addDocument(formData);
                alert("Payroll Added!");
            }
            setFormData(initialFormState);
            setEditingId(null);
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setLoadingForm(false);
        }
    };

    const handleEdit = (record) => {
        setFormData(record);
        setEditingId(record.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if(window.confirm("Delete this payroll record?")) {
            await deleteDocument(id);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2>
                    <p className="text-sm text-gray-500 mt-1">Calculate and manage monthly employee salaries.</p>
                </div>
                <button 
                    onClick={() => navigate('/hr/yearly-payoff')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 font-medium text-sm"
                >
                    📈 Yearly Report
                </button>
            </div>

            {/* --- FORM CARD --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-10 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">
                        {editingId ? '✏️ Edit Payroll Record' : '✨ New Payroll Entry'}
                    </h3>
                    {editingId && (
                        <button 
                            onClick={() => { setEditingId(null); setFormData(initialFormState); }}
                            className="text-xs text-red-500 hover:text-red-700 underline"
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>
                
                <div className="p-6">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            
                            {/* Section 1: Employee Details */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Employee Info</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                                    <select name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                                        <option value="">-- Choose (Sorted by ID) --</option>
                                        {employees?.map(emp => <option key={emp.uid} value={emp.uid}>{emp.name} ({emp.empId})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                                    <input type="month" name="month" value={formData.month} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="Processed">Processed</option>
                                        <option value="Hold">On Hold</option>
                                        <option value="Paid">Paid</option>
                                    </select>
                                </div>
                            </div>

                            {/* Section 2: Earnings & Days */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Earnings & Days</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary (₹)</label>
                                    <input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Total Days</label>
                                        <input type="number" name="totalWorkingDays" value={formData.totalWorkingDays} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Paid Leaves</label>
                                        <input type="number" name="paidLeaves" value={formData.paidLeaves} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Active Days (Auto)</label>
                                    <input type="number" name="activeWorkingDays" value={formData.activeWorkingDays} readOnly className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed" />
                                </div>
                            </div>

                            {/* Section 3: Deductions & Net */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Deductions</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unpaid Leaves (Days)</label>
                                    <input type="number" name="unpaidLeaves" value={formData.unpaidLeaves} onChange={handleChange} className="w-full px-3 py-2 border border-red-200 bg-red-50/30 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Imprest</label>
                                        <input type="number" name="imprest" value={formData.imprest} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Advance</label>
                                        <input type="number" name="advanceSalary" value={formData.advanceSalary} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                    </div>
                                </div>
                                
                                {/* Net Salary Highlight */}
                                <div className="pt-2">
                                    <label className="block text-xs font-bold text-green-600 mb-1 uppercase tracking-wide">Net Salary Payable</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-green-600 font-bold">₹</span>
                                        <input type="number" name="netSalary" value={formData.netSalary} readOnly className="w-full pl-8 pr-3 py-2 border-2 border-green-400 bg-green-50 rounded-lg font-bold text-green-700 text-lg" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="border-t border-gray-100 pt-4 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={loadingForm} 
                                className={`px-8 py-2.5 rounded-lg text-white font-bold shadow-md transition-all active:scale-95
                                ${loadingForm ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
                            >
                                {loadingForm ? 'Processing...' : (editingId ? 'Update Record' : 'Save Payroll Record')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* --- RECORDS TABLE --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-700">Recent Payroll History</h3>
                </div>
                
                {loadingData ? <div className="p-10"><LoadingSpinner message="Fetching records..." /></div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Employee</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Month</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Basic</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Deductions</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Net Pay</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payrollRecords?.map(rec => (
                                    <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800">{rec.employeeName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{rec.month}</td>
                                        <td className="px-6 py-4 text-sm">₹{rec.basicSalary}</td>
                                        <td className="px-6 py-4 text-sm text-red-500 font-medium">
                                            -₹{parseInt(rec.imprest || 0) + parseInt(rec.advanceSalary || 0) + (parseInt(rec.unpaidLeaves || 0) * (rec.basicSalary/rec.totalWorkingDays))}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-bold">
                                                ₹{rec.netSalary}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEdit(rec)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button onClick={() => handleDelete(rec.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PayrollManagement;