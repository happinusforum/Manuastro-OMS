import React, { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { 
  Search, Calendar, Eye, FileText, ArrowLeft, X, Download
} from 'lucide-react';
import { generatePayslipBlob } from '../../utils/generatePayslip';
import { useNavigate } from 'react-router-dom';

const PayrollRecords = () => {
  const navigate = useNavigate();
  // Fetch all payroll records from Firestore
  const { documents: records, isPending } = useCollection('payroll', null, ['createdAt', 'desc']);

  // --- STATE ---
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Modal
  const [viewUrl, setViewUrl] = useState(null);

  // --- FILTER LOGIC ---
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    
    return records.filter(doc => {
      // Allow filtering by month (optional, if selectedMonth is empty show all)
      const matchMonth = selectedMonth ? doc.month === selectedMonth : true;
      const matchName = doc.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        doc.empCode?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMonth && matchName;
    });
  }, [records, selectedMonth, searchTerm]);

  // --- HANDLER: VIEW RECEIPT ---
  const handleViewReceipt = (record) => {
    const pdfBlob = generatePayslipBlob(record);
    setViewUrl(pdfBlob);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-50"><ArrowLeft size={20} /></button>
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-indigo-600" /> Payroll Records
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">View, download and manage employee payslips</p>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Filter by Month</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="month" 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg outline-none font-bold dark:[color-scheme:dark]"
                    />
                </div>
            </div>
            <div className="flex-[2] w-full">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Search Employee</label>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by Name or Emp ID..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg outline-none"
                    />
                </div>
            </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">Employee</th>
                            <th className="p-4">Designation</th>
                            <th className="p-4 text-right">Gross Pay</th>
                            <th className="p-4 text-right">Deductions</th>
                            <th className="p-4 text-right">Net Pay</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                        {isPending && <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading records...</td></tr>}
                        {!isPending && filteredRecords.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-500">No records found.</td></tr>}

                        {filteredRecords.map((doc) => (
                            <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-gray-900 dark:text-white">{doc.employeeName}</div>
                                    <div className="text-xs text-gray-500 font-mono">{doc.empCode || doc.id}</div>
                                </td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">{doc.designation} <br/> <span className="text-xs opacity-70">{doc.department}</span></td>
                                <td className="p-4 text-right font-medium">₹{Number(doc.grossEarnings || doc.totals?.grossEarnings).toLocaleString()}</td>
                                <td className="p-4 text-right text-rose-500 font-medium">- ₹{Number(doc.totalDeductions || doc.totals?.totalDeductions).toLocaleString()}</td>
                                <td className="p-4 text-right font-bold text-emerald-600">₹{Number(doc.netSalary || doc.totals?.netPay).toLocaleString()}</td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => handleViewReceipt(doc)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors font-bold text-xs"
                                    >
                                        <Eye size={16} /> View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>

      {/* PDF Viewer Modal */}
      {viewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Payslip Preview</h3>
                    <div className="flex gap-3">
                        <a href={viewUrl} download="payslip.pdf" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700"><Download size={16}/> Download</a>
                        <button onClick={() => setViewUrl(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X size={20}/></button>
                    </div>
                </div>
                <iframe src={viewUrl} className="w-full h-full border-none" title="PDF Preview"></iframe>
            </div>
        </div>
      )}

    </div>
  );
};

export default PayrollRecords;