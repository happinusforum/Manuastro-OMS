// src/pages/hr/PayrollManagement.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { 
    Banknote, Calendar, User, FileText, CheckCircle, AlertCircle, 
    Edit, Trash2, Plus, ArrowRight, Wallet 
} from 'lucide-react';

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

    // 1. Fetch Employees
    const employeeFilters = useMemo(() => [['role', '==', 'employee']], []);
    const { data: rawEmployees } = useFirestore('users', employeeFilters);

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
            } else {
                await addDocument(formData);
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
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Payroll Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                        <Wallet size={16} /> Calculate and manage monthly employee salaries.
                    </p>
                </div>
                <button 
                    onClick={() => navigate('/hr/yearly-payoff')}
                    className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md transition-all font-medium text-sm"
                >
                    <FileText size={16} /> Yearly Report
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- LEFT: PAYROLL FORM (Sticky) --- */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden sticky top-6 transition-colors duration-300">
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                {editingId ? <Edit size={18} /> : <Plus size={18} />}
                                {editingId ? 'Edit Payroll' : 'New Entry'}
                            </h3>
                            {editingId && (
                                <button 
                                    onClick={() => { setEditingId(null); setFormData(initialFormState); }}
                                    className="text-xs text-indigo-100 hover:text-white underline bg-white/10 px-2 py-1 rounded"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                        
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                
                                {/* Employee & Date */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Employee</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={16} />
                                            <select name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" required>
                                                <option value="">Select Employee</option>
                                                {employees?.map(emp => <option key={emp.uid} value={emp.uid}>{emp.name} ({emp.empId})</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Month</label>
                                            <input type="month" name="month" value={formData.month} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:[color-scheme:dark]" required />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Status</label>
                                            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                                <option value="Processed">Processed</option>
                                                <option value="Hold">On Hold</option>
                                                <option value="Paid">Paid</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100 dark:bg-gray-700"></div>

                                {/* Salary Details */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Basic Salary</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 font-bold">₹</span>
                                        <input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} className="w-full pl-8 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700" required />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Total Days</label>
                                        <input type="number" name="totalWorkingDays" value={formData.totalWorkingDays} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Unpaid Leaves</label>
                                        <input type="number" name="unpaidLeaves" value={formData.unpaidLeaves} onChange={handleChange} className="w-full px-3 py-2 border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm text-red-600 dark:text-red-400 font-medium" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Imprest</label>
                                        <input type="number" name="imprest" value={formData.imprest} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Advance</label>
                                        <input type="number" name="advanceSalary" value={formData.advanceSalary} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                    </div>
                                </div>

                                {/* Net Pay Card */}
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Net Payable Amount</span>
                                    <div className="flex items-start">
                                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">₹</span>
                                        <span className="text-4xl font-extrabold text-emerald-700 dark:text-emerald-300">{formData.netSalary.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loadingForm} 
                                    className={`w-full py-3 rounded-xl text-white font-bold shadow-lg transition-all flex justify-center items-center gap-2
                                    ${loadingForm ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 hover:scale-[1.02] active:scale-95'}`}
                                >
                                    {loadingForm ? <LoadingSpinner size="20px" color="white"/> : <><CheckCircle size={18} /> {editingId ? 'Update Record' : 'Save Payroll'}</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: RECORDS LIST --- */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/30 dark:bg-gray-700/30">
                            <h3 className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2">
                                <Banknote size={20} className="text-gray-500 dark:text-gray-400" /> Recent Records
                            </h3>
                        </div>
                        
                        {loadingData ? <div className="p-12 flex justify-center"><LoadingSpinner /></div> : (
                            <div className="overflow-x-auto">
                                <table className="w-full whitespace-nowrap text-left">
                                    <thead className="bg-gray-50/80 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Month</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Basic</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Deductions</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Net Pay</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                        {payrollRecords?.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="p-12 text-center text-gray-400 dark:text-gray-500">No payroll records found.</td>
                                            </tr>
                                        ) : (
                                            payrollRecords?.map(rec => (
                                                <tr key={rec.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-800 dark:text-white text-sm">{rec.employeeName}</div>
                                                        <div className="text-xs text-gray-400 dark:text-gray-500">{rec.status}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                        {rec.month}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-300">₹{rec.basicSalary}</td>
                                                    <td className="px-6 py-4 text-sm font-mono text-red-500 dark:text-red-400 font-medium">
                                                        -₹{Math.round(parseInt(rec.imprest || 0) + parseInt(rec.advanceSalary || 0) + (parseInt(rec.unpaidLeaves || 0) * (rec.basicSalary/rec.totalWorkingDays)))}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg text-sm font-bold font-mono">
                                                            ₹{rec.netSalary}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEdit(rec)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Edit">
                                                                <Edit size={16} />
                                                            </button>
                                                            <button onClick={() => handleDelete(rec.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PayrollManagement;