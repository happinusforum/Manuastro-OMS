import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, Building2, UserCheck, Calendar, Download, 
  List
} from 'lucide-react';
import useTallyShortcuts from '../../hooks/useTallyShortcuts';
import { useFirestore } from '../../hooks/useFirestore'; 
import { useCollection } from '../../hooks/useCollection';
import { generatePayslipBlob } from '../../utils/generatePayslip'; // ✅ Integrated

const PT_SLABS = [
  { limit: 7500, tax: 0 },
  { limit: 10000, tax: 175 },
  { limit: Infinity, tax: 200 } 
];

const EnterprisePayroll = () => {
  const navigate = useNavigate();
  const { addDocument, response } = useFirestore('payroll'); 
  const { documents: employees } = useCollection('users', ['role', '==', 'employee']);

  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [selectedEmpUid, setSelectedEmpUid] = useState('');
  
  // ✅ All fields (Manual + Auto)
  const [empDetails, setEmpDetails] = useState({
    name: '', id: '', designation: '', department: '', 
    pan: '', uan: '', bank: '', bankName: '', doj: ''
  });

  const [salaryMode, setSalaryMode] = useState('yearly'); 
  const [salaryInput, setSalaryInput] = useState(600000); 
  const [settings, setSettings] = useState({
    monthDays: 30, paidDays: 30, basicPercent: 50, 
    pfEnabled: true, esicEnabled: true, ptEnabled: true,
  });

  const [financials, setFinancials] = useState({
    basic: 0, hra: 0, special: 0, incentive: 0, arrears: 0,
    pf: 0, esic: 0, pt: 0, tds: 0, advance: 0
  });

  // --- 1. AUTO-FILL EMPLOYEE ---
  useEffect(() => {
    if (selectedEmpUid && employees) {
      const emp = employees.find(e => e.id === selectedEmpUid);
      if (emp) {
        setEmpDetails({
          name: emp.name || '', id: emp.empId || '', 
          designation: emp.designation || '', department: emp.department || '', 
          pan: emp.pan || '', uan: emp.uan || '', 
          bank: emp.bankAccount || '', bankName: emp.bankName || 'HDFC Bank',
          doj: emp.joiningDate || ''
        });
        if(emp.ctc) {
            setSalaryMode('yearly');
            setSalaryInput(Number(emp.ctc));
        }
      }
    }
  }, [selectedEmpUid, employees]);

  // --- 2. CALCULATOR ENGINE ---
  useEffect(() => {
    let monthlyCTC = salaryMode === 'yearly' ? Number(salaryInput) / 12 : Number(salaryInput);
    const proration = settings.monthDays > 0 ? settings.paidDays / settings.monthDays : 0;

    const basic = Math.round(monthlyCTC * (settings.basicPercent / 100) * proration);
    const hra = Math.round(basic * 0.50); 
    const special = Math.round(monthlyCTC * proration) - (basic + hra); 

    let pf = 0;
    if (settings.pfEnabled) {
      const pfBasis = basic > 15000 ? 15000 : basic;
      pf = Math.round(pfBasis * 0.12);
    }

    let esic = 0;
    const gross = basic + hra + special; 
    if (settings.esicEnabled && gross <= 21000) {
      esic = Math.ceil(gross * 0.0075);
    }

    let pt = 0;
    if (settings.ptEnabled) {
      const slab = PT_SLABS.find(s => gross <= s.limit);
      pt = slab ? slab.tax : 200;
    }

    // Set financials allowing manual override later
    setFinancials(prev => ({ ...prev, basic, hra, special, pf, esic, pt }));

  }, [salaryInput, salaryMode, settings]);

  const totals = useMemo(() => {
    const grossEarnings = Number(financials.basic) + Number(financials.hra) + Number(financials.special) + Number(financials.incentive) + Number(financials.arrears);
    const totalDeductions = Number(financials.pf) + Number(financials.esic) + Number(financials.pt) + Number(financials.tds) + Number(financials.advance);
    const netPay = grossEarnings - totalDeductions;
    return { grossEarnings, totalDeductions, netPay };
  }, [financials]);

  const handleFinancialChange = (e) => {
    setFinancials({ ...financials, [e.target.name]: Number(e.target.value) });
  };

  const handleSaveRecord = async () => {
    if (!empDetails.name) return alert("Please enter Employee Name.");
    const payrollRecord = {
      ...empDetails,
      month: targetMonth,
      financials,
      totals,
      settings,
      createdAt: new Date().toISOString(),
      status: 'Processed'
    };
    await addDocument(payrollRecord);
    alert(`Payroll for ${empDetails.name} saved!`);
  };

  // ✅ Uses Utility
  const handleGeneratePDF = () => {
    const data = { ...empDetails, month: targetMonth, financials, totals, settings };
    const pdfBlob = generatePayslipBlob(data);
    window.open(pdfBlob, '_blank');
  };

  useTallyShortcuts({ onSave: handleSaveRecord, onPrint: handleGeneratePDF });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <Building2 size={32} /> Enterprise Payroll
            </h1>
            <p className="text-sm text-gray-500 font-medium">Professional Salary Processing</p>
          </div>
          <div className="flex gap-3 items-center">
            {/* 🔥 VIEW ALL RECEIPTS BUTTON */}
            <button onClick={() => navigate('/hr/payroll-records')} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-xl font-bold transition-all"><List size={20} /> History</button>
            <input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl outline-none font-bold text-gray-700 dark:text-gray-200 dark:[color-scheme:dark]" />
            <button onClick={handleGeneratePDF} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg font-bold transition-all active:scale-95"><Download size={20} /> PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
             {/* LEFT: Employee & Config */}
             <div className="xl:col-span-4 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><UserCheck size={18} className="text-blue-500"/> Employee Info</h3>
                    </div>
                    <div className="space-y-3">
                        <select value={selectedEmpUid} onChange={(e) => setSelectedEmpUid(e.target.value)} className="input-field font-bold">
                        <option value="">-- Auto Fill From Database --</option>
                        {employees && employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                        </select>
                        <input type="text" placeholder="Employee Name" value={empDetails.name} onChange={(e) => setEmpDetails({...empDetails, name: e.target.value})} className="input-field" />
                        <div className="grid grid-cols-2 gap-3">
                            <input type="text" placeholder="Emp ID" value={empDetails.id} onChange={(e) => setEmpDetails({...empDetails, id: e.target.value})} className="input-field" />
                            <input type="text" placeholder="Designation" value={empDetails.designation} onChange={(e) => setEmpDetails({...empDetails, designation: e.target.value})} className="input-field" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="text" placeholder="Department" value={empDetails.department} onChange={(e) => setEmpDetails({...empDetails, department: e.target.value})} className="input-field" />
                            <input type="text" placeholder="PAN No" value={empDetails.pan} onChange={(e) => setEmpDetails({...empDetails, pan: e.target.value})} className="input-field uppercase" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="text" placeholder="Bank Name" value={empDetails.bankName} onChange={(e) => setEmpDetails({...empDetails, bankName: e.target.value})} className="input-field" />
                            <input type="text" placeholder="Account No" value={empDetails.bank} onChange={(e) => setEmpDetails({...empDetails, bank: e.target.value})} className="input-field" />
                        </div>
                        <input type="text" placeholder="UAN No" value={empDetails.uan} onChange={(e) => setEmpDetails({...empDetails, uan: e.target.value})} className="input-field" />
                    </div>
                </div>
                {/* Salary Config */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-4"><Calendar size={18} className="text-orange-500"/> Settings</h3>
                    <div className="flex gap-2 mb-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <button onClick={() => setSalaryMode('yearly')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${salaryMode === 'yearly' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Annual CTC</button>
                        <button onClick={() => setSalaryMode('monthly')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${salaryMode === 'monthly' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Monthly Gross</button>
                    </div>
                    <div className="relative mb-3">
                        <span className="absolute left-3 top-2.5 text-gray-400">₹</span>
                        <input type="number" value={salaryInput} onChange={(e) => setSalaryInput(e.target.value)} className="input-field pl-8 font-mono text-lg font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div><label className="text-xs text-gray-500 font-bold">Paid Days</label><input type="number" name="paidDays" value={settings.paidDays} onChange={(e) => setSettings({...settings, paidDays: e.target.value})} className="input-field" /></div>
                        <div><label className="text-xs text-gray-500 font-bold">Total Days</label><input type="number" name="monthDays" value={settings.monthDays} onChange={(e) => setSettings({...settings, monthDays: e.target.value})} className="input-field" /></div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center"><span className="text-sm">PF (12%)</span><input type="checkbox" checked={settings.pfEnabled} onChange={(e) => setSettings({...settings, pfEnabled: e.target.checked})} className="accent-indigo-600 w-4 h-4"/></div>
                        <div className="flex justify-between items-center"><span className="text-sm">ESIC (0.75%)</span><input type="checkbox" checked={settings.esicEnabled} onChange={(e) => setSettings({...settings, esicEnabled: e.target.checked})} className="accent-indigo-600 w-4 h-4"/></div>
                    </div>
                </div>
             </div>

             {/* RIGHT: Financials */}
             <div className="xl:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 border-b border-emerald-100 dark:border-emerald-800"><h3 className="font-bold text-emerald-700 dark:text-emerald-400">Earnings</h3></div>
                        <div className="p-5 space-y-3">
                            <InputRow label="Basic Salary" name="basic" value={financials.basic} onChange={handleFinancialChange} />
                            <InputRow label="HRA" name="hra" value={financials.hra} onChange={handleFinancialChange} />
                            <InputRow label="Special Allow." name="special" value={financials.special} onChange={handleFinancialChange} />
                            <InputRow label="Incentive" name="incentive" value={financials.incentive} onChange={handleFinancialChange} />
                            <InputRow label="Arrears" name="arrears" value={financials.arrears} onChange={handleFinancialChange} />
                            <div className="pt-3 border-t dark:border-gray-700 flex justify-between font-bold text-gray-700 dark:text-white">
                                <span>Gross Earnings</span><span>₹{totals.grossEarnings.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-rose-100 dark:border-rose-900/30 overflow-hidden">
                        <div className="bg-rose-50 dark:bg-rose-900/20 p-4 border-b border-rose-100 dark:border-rose-800"><h3 className="font-bold text-rose-700 dark:text-rose-400">Deductions</h3></div>
                        <div className="p-5 space-y-3">
                            <InputRow label="Provident Fund" name="pf" value={financials.pf} onChange={handleFinancialChange} />
                            <InputRow label="ESIC" name="esic" value={financials.esic} onChange={handleFinancialChange} />
                            <InputRow label="Prof. Tax" name="pt" value={financials.pt} onChange={handleFinancialChange} />
                            <InputRow label="TDS (Tax)" name="tds" value={financials.tds} onChange={handleFinancialChange} />
                            <InputRow label="Advance" name="advance" value={financials.advance} onChange={handleFinancialChange} />
                            <div className="pt-3 border-t dark:border-gray-700 flex justify-between font-bold text-rose-600">
                                <span>Total Deductions</span><span>₹{totals.totalDeductions.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Net Pay Card */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-center">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Net Salary Payable</p>
                        <h1 className="text-5xl font-extrabold tracking-tight">₹{totals.netPay.toLocaleString()}</h1>
                    </div>
                    <div className="flex gap-4 mt-6 md:mt-0">
                        <button onClick={handleSaveRecord} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-900 rounded-xl font-bold shadow-lg flex items-center gap-2"><Save size={18}/> Save</button>
                    </div>
                </div>
             </div>
        </div>
      </div>
      <style>{` .input-field { width: 100%; padding: 8px 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; outline: none; font-size: 0.875rem; } .dark .input-field { background-color: #374151; border-color: #4b5563; color: #fff; } .input-field:focus { border-color: #6366f1; } `}</style>
    </div>
  );
};

const InputRow = ({ label, value, name, onChange }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</span>
    <input type="number" name={name} value={value} onChange={onChange} className="w-28 p-1.5 text-right bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm outline-none focus:border-blue-500" />
  </div>
);

export default EnterprisePayroll;