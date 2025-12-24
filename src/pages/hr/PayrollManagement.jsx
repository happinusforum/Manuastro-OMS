// src/pages/hr/PayrollManagement.jsx (FINAL: SORTED DROPDOWN & LOGIC)

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

    // 2. Fetch Payroll Records
    const { 
        data: payrollRecords, 
        loading: loadingData, 
        addDocument, 
        updateDocument, 
        deleteDocument 
    } = useFirestore('payroll');

    // 🧠 AUTO CALCULATION LOGIC
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
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Payroll Management (Entry)</h2>
                <button 
                    onClick={() => navigate('/hr/yearly-payoff')}
                    className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 transition"
                >
                    📈 View Yearly Payoff Report
                </button>
            </div>

            {/* FORM SECTION */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">{editingId ? 'Edit Payroll' : 'Create New Payroll'}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Row 1: Employee & Month */}
                    <div className="md:col-span-1">
                        <label className="text-xs font-bold text-gray-600">Select Employee</label>
                        <select name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full p-2 border rounded" required>
                            <option value="">-- Select (Sorted by ID) --</option>
                            {employees?.map(emp => <option key={emp.uid} value={emp.uid}>{emp.name} ({emp.empId})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600">Month</label>
                        <input type="month" name="month" value={formData.month} onChange={handleChange} className="w-full p-2 border rounded" required />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600">Status</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded">
                            <option value="Processed">Processed</option>
                            <option value="Hold">Hold</option>
                            <option value="Paid">Paid</option>
                        </select>
                    </div>

                    {/* Row 2: Basic & Days */}
                    <div>
                        <label className="text-xs font-bold text-gray-600">Basic Salary (₹)</label>
                        <input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} className="w-full p-2 border rounded" required />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600">Total Working Days</label>
                        <input type="number" name="totalWorkingDays" value={formData.totalWorkingDays} onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600">Active Working Days (Auto)</label>
                        <input type="number" name="activeWorkingDays" value={formData.activeWorkingDays} readOnly className="w-full p-2 border rounded bg-gray-100" />
                    </div>

                    {/* Row 3: Leaves */}
                    <div>
                        <label className="text-xs font-bold text-gray-600">Paid Leaves</label>
                        <input type="number" name="paidLeaves" value={formData.paidLeaves} onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600">Unpaid Leaves (Deduction)</label>
                        <input type="number" name="unpaidLeaves" value={formData.unpaidLeaves} onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>

                    {/* Row 4: Deductions */}
                    <div>
                        <label className="text-xs font-bold text-gray-600">Imprest (Exp)</label>
                        <input type="number" name="imprest" value={formData.imprest} onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600">Advance Salary</label>
                        <input type="number" name="advanceSalary" value={formData.advanceSalary} onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    
                    {/* NET SALARY HIGHLIGHT */}
                    <div className="md:col-span-1 bg-green-50 p-2 rounded border border-green-200">
                        <label className="text-xs font-bold text-green-700">NET SALARY (Auto Calc)</label>
                        <input type="number" name="netSalary" value={formData.netSalary} readOnly className="w-full p-2 border rounded bg-white font-bold text-green-700 text-lg" />
                    </div>

                    <div className="md:col-span-3">
                        <button type="submit" disabled={loadingForm} className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 w-full font-bold">
                            {loadingForm ? 'Saving...' : (editingId ? 'Update Record' : 'Save Payroll Record')}
                        </button>
                    </div>
                </form>
            </div>

            {/* LIST SECTION */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <h3 className="p-4 font-bold border-b">Recent Records</h3>
                {loadingData ? <LoadingSpinner /> : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-sm">Emp Name</th>
                                <th className="p-3 text-sm">Month</th>
                                <th className="p-3 text-sm">Basic</th>
                                <th className="p-3 text-sm">Deductions (Imp+Adv)</th>
                                <th className="p-3 text-sm">Net Pay</th>
                                <th className="p-3 text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrollRecords?.map(rec => (
                                <tr key={rec.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">{rec.employeeName}</td>
                                    <td className="p-3">{rec.month}</td>
                                    <td className="p-3">₹{rec.basicSalary}</td>
                                    <td className="p-3 text-red-500">-₹{parseInt(rec.imprest) + parseInt(rec.advanceSalary)}</td>
                                    <td className="p-3 font-bold text-green-600">₹{rec.netSalary}</td>
                                    <td className="p-3">
                                        <button onClick={() => handleEdit(rec)} className="text-blue-500 mr-3">Edit</button>
                                        <button onClick={() => handleDelete(rec.id)} className="text-red-500">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default PayrollManagement;