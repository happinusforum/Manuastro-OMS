// src/pages/admin/LeadsManagementSystem.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Users, Search, Download, ShieldCheck, Lock, Check, X, 
    Phone, MapPin, Plus, Trash2, Edit2, Save, Upload,
    Activity, FileText, Calendar, Truck, Package, ArrowLeft, Clock, DollarSign, 
    Cake, Send, Crown, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; 

import { useAuth } from '../../context/AuthContext'; 
import { useCollection } from '../../hooks/useCollection';
import { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, arrayUnion, onSnapshot } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 

// --- UTILS ---
const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

const parseDate = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') return new Date(dateVal);
    if (dateVal.toDate) return dateVal.toDate(); 
    return new Date(dateVal);
};

const formatDate = (dateVal) => {
    const date = parseDate(dateVal);
    return date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
};

const generateChangeLog = (oldData, newData) => {
  const changes = [];
  const ignoredKeys = ['history', 'appointments', 'createdAt', 'createdBy', 'id', 'receivedAmount', 'paymentHistory', 'updatedAt', 'followUps'];

  Object.keys(newData).forEach(key => {
    if (ignoredKeys.includes(key)) return;
    const oldVal = (oldData[key] || '').toString().trim();
    const newVal = (newData[key] || '').toString().trim();

    if (oldVal !== newVal) {
       const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
       changes.push(`${label}: ${oldVal || 'Empty'} ➝ ${newVal || 'Empty'}`);
    }
  });
  return changes.length > 0 ? changes.join('\n') : "Details updated";
};

const slideInRight = { hidden: { x: '100%' }, visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { x: '100%' } };

// =================================================================================================
// 🎂 BIRTHDAY REPORT MODAL (Unchanged)
// =================================================================================================
const BirthdayReportModal = ({ isOpen, onClose, leads }) => {
    if (!isOpen) return null;

    const { upcoming, recent } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingList = [];
        const recentList = [];

        leads?.forEach(lead => {
            const dobDate = parseDate(lead.dob); 
            if (!dobDate || isNaN(dobDate)) return;
            
            const currentYearBday = new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate());
            const diffTime = currentYearBday - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 7) {
                upcomingList.push({ ...lead, daysLeft: diffDays });
            } else if (diffDays >= -7 && diffDays < 0) {
                recentList.push({ ...lead, daysAgo: Math.abs(diffDays) });
            }
        });

        return { upcoming: upcomingList, recent: recentList };
    }, [leads]);

    const handleExportBirthdays = () => {
        const data = [
            ...upcoming.map(l => ({ Type: "Upcoming", Name: l.name, Phone: l.phone, DOB: formatDate(l.dob), Status: `In ${l.daysLeft} days` })),
            ...recent.map(l => ({ Type: "Past", Name: l.name, Phone: l.phone, DOB: formatDate(l.dob), Status: `${l.daysAgo} days ago` }))
        ];
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Birthdays");
        XLSX.writeFile(wb, "Birthday_Report.xlsx");
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-800 w-full md:w-[600px] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[85vh]">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-pink-500 to-rose-500 rounded-t-2xl text-white">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Cake size={24}/> Birthday Reminders</h2>
                  <button onClick={onClose}><X className="text-white/80 hover:text-white transition-transform"/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                  
                  {/* Upcoming Section */}
                  <div>
                      <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                         <Calendar size={16}/> Upcoming (Next 7 Days)
                      </h3>
                      {upcoming.length === 0 ? <p className="text-sm text-gray-400 italic">No upcoming birthdays.</p> : (
                        <div className="space-y-2">
                           {upcoming.map(l => (
                               <div key={l.id} className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                  <div>
                                     <p className="font-bold text-gray-800 dark:text-gray-200">{l.name}</p>
                                     <p className="text-xs text-gray-500">{formatDate(l.dob)} • {l.phone}</p>
                                  </div>
                                  <span className="text-xs font-bold bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm text-emerald-600">
                                     {l.daysLeft === 0 ? "Today! 🎂" : `In ${l.daysLeft} days`}
                                  </span>
                               </div>
                           ))}
                        </div>
                      )}
                  </div>

                  {/* Past Section */}
                  <div>
                      <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                         <Clock size={16}/> Recent Past (Last 7 Days)
                      </h3>
                      {recent.length === 0 ? <p className="text-sm text-gray-400 italic">No recent birthdays.</p> : (
                        <div className="space-y-2">
                           {recent.map(l => (
                               <div key={l.id} className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800 opacity-80">
                                  <div>
                                     <p className="font-bold text-gray-800 dark:text-gray-200">{l.name}</p>
                                     <p className="text-xs text-gray-500">{formatDate(l.dob)} • {l.phone}</p>
                                  </div>
                                  <span className="text-xs font-bold text-orange-500">
                                     {l.daysAgo} days ago
                                  </span>
                               </div>
                           ))}
                        </div>
                      )}
                  </div>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl flex justify-end">
                  <button onClick={handleExportBirthdays} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                     <Download size={18}/> Export List
                  </button>
              </div>
           </motion.div>
        </div>
    );
};


// =================================================================================================
// 🎨 LEAD DETAIL VIEW (Unchanged)
// =================================================================================================
const LeadDetailView = ({ lead, onClose, onEdit, onExportSingle, onDelete, canManage, userProfile }) => {
    if (!lead) return null;
    const totalRec = lead.paymentHistory?.reduce((sum, p) => sum + (parseFloat(p.amount)||0), 0) || 0;
    const netAmount = ((parseFloat(lead.productAmount)||0) + (parseFloat(lead.makingCharges)||0)) - (parseFloat(lead.discount)||0);
    const due = netAmount - totalRec;

    const [newNote, setNewNote] = useState('');
    const [isSendingNote, setIsSendingNote] = useState(false);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setIsSendingNote(true);
        try {
            const noteData = {
                message: newNote,
                date: new Date(),
                by: userProfile?.name || 'User'
            };
            const leadRef = doc(db, 'leads', lead.id);
            await updateDoc(leadRef, { followUps: arrayUnion(noteData) });
            setNewNote('');
        } catch (error) {
            console.error("Error adding note:", error);
            alert("Failed to add note.");
        } finally {
            setIsSendingNote(false);
        }
    };

    return (
        <motion.div variants={slideInRight} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 z-40 bg-gray-50 dark:bg-gray-900 flex flex-col shadow-2xl">
           <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                 <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ArrowLeft size={24}/></button>
                 <div>
                    <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 flex-wrap">
                       {lead.name}
                       <span className={`text-xs px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider ${lead.status === 'Converted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{lead.status}</span>
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4 mt-1.5 font-medium"><span className="flex gap-1"><Phone size={12}/> {lead.phone}</span><span className="flex gap-1"><MapPin size={12}/> {lead.location}</span></p>
                 </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                 {canManage && (
                    <button onClick={() => onDelete(lead.id)} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm font-bold flex gap-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                        <Trash2 size={16}/> Delete
                    </button>
                 )}
                 <button onClick={() => onExportSingle(lead)} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-white dark:bg-gray-700 border rounded-lg text-sm font-bold flex gap-2"><Download size={16}/> Export</button>
                 <button onClick={() => onEdit(lead)} className="flex-1 sm:flex-none justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md flex gap-2"><Edit2 size={16}/> Edit</button>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-dots-pattern">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
                 <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <StatCard label="Lead Date" value={formatDate(lead.leadGenDate)} icon={Calendar} />
                       <StatCard label="Confirmation" value={formatDate(lead.confirmationDate)} icon={Check} color="text-green-600 bg-green-50 dark:bg-green-900/20"/>
                       <StatCard label="Delivery" value={formatDate(lead.deliveryDate)} icon={Truck} color="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"/>
                       <StatCard label="Conv. Prob." value={`${lead.conversionProbability}%`} icon={Activity} />
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden group">
                       <div className="absolute -top-6 -right-6 p-4 opacity-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full w-32 h-32 blur-2xl"></div>
                       <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Package size={14}/> Product Specification</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8 text-sm relative z-10">
                          <DetailRow label="Particular" value={lead.particular} />
                          <DetailRow label="Type / Metal" value={`${lead.type} / ${lead.metal}`} />
                          <DetailRow label="Gender" value={lead.gender} />
                          <DetailRow label="Weight" value={`${lead.weight} ${lead.unit}`} highlight />
                          <DetailRow label="Size" value={lead.size} />
                          <DetailRow label="SKU No." value={lead.skuNo} fontMono />
                          <DetailRow label="Certificate" value={lead.certificateNo} />
                          <DetailRow label="Jeweller" value={lead.jewellerName} />
                          <DetailRow label="Status" value={lead.ornamentReady ? "Ready" : "Process"} color={lead.ornamentReady ? "text-green-600" : "text-amber-500"} />
                       </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                       <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><DollarSign size={14}/> Financials</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                             <div className="flex justify-between text-sm p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"><span>Product Amount</span> <span className="font-bold">{formatCurrency(lead.productAmount)}</span></div>
                             <div className="flex justify-between text-sm p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"><span>Making Charges</span> <span className="font-bold">{formatCurrency(lead.makingCharges)}</span></div>
                             <div className="flex justify-between text-sm p-2 rounded hover:bg-red-50 text-red-500"><span>Discount</span> <span>- {formatCurrency(lead.discount)}</span></div>
                             <div className="flex justify-between text-lg font-bold border-t pt-3 mt-2"><span>Net Payable</span> <span className="text-indigo-600">{formatCurrency(netAmount)}</span></div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                             <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-wider">Payment History</h4>
                             <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                {lead.paymentHistory?.map((p, i) => (
                                   <div key={i} className="flex justify-between text-xs bg-white dark:bg-gray-800 p-2.5 rounded shadow-sm border">
                                      <span className="font-mono text-gray-500">{formatDate(p.date)} • {p.mode}</span> <span className="font-bold text-green-600">{formatCurrency(p.amount)}</span>
                                   </div>
                                ))}
                                {!lead.paymentHistory?.length && <div className="text-center text-xs text-gray-400 py-4">No payments yet</div>}
                             </div>
                             <div className="mt-4 pt-3 border-t flex justify-between font-bold items-center"><span className="text-xs uppercase text-gray-500">Balance Due</span><span className={`text-xl ${due > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(due)}</span></div>
                          </div>
                       </div>
                    </div>
                 </div>
                 
                 <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                       <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={14}/> Client Info</h3>
                       <div className="space-y-3 text-sm">
                          <DetailRow label="DOB" value={formatDate(lead.dob)} highlight />
                          <DetailRow label="Source" value={lead.source} />
                          <DetailRow label="Email" value={lead.email} />
                       </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-indigo-100 dark:border-gray-700 shadow-sm">
                       <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Truck size={14}/> Logistics</h3>
                       <div className="space-y-3 text-sm">
                          <DetailRow label="Courier" value={lead.courierCompany} />
                          <DetailRow label="Docket No" value={lead.courierDocket} fontMono />
                          <DetailRow label="Sent Date" value={formatDate(lead.courierDate)} />
                          <DetailRow label="Invoice No" value={lead.invoiceNo} fontMono />
                          <div className="pt-4"><span className={`block text-center text-xs font-bold py-2 rounded-lg border shadow-sm ${lead.leadClose ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{lead.leadClose ? '🔴 LEAD CLOSED' : '🟢 LEAD OPEN'}</span></div>
                       </div>
                    </div>

                    {/* Follow Up & Notes */}
                    <div className="bg-amber-50/50 dark:bg-gray-800 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 p-5 flex flex-col h-[400px]">
                       <h3 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase mb-3 flex items-center gap-2"><FileText size={14}/> Follow Ups & Notes</h3>
                       
                       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mb-3">
                          {lead.followUps?.length > 0 ? (
                              lead.followUps.slice().reverse().map((note, i) => (
                                 <div key={i} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-amber-100 dark:border-gray-700 shadow-sm">
                                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{note.message}</p>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                       <span className="text-[10px] font-bold text-amber-600">{note.by}</span>
                                       <span className="text-[10px] text-gray-400">
                                          {note.date?.toDate ? note.date.toDate().toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Just now'}
                                       </span>
                                    </div>
                                 </div>
                              ))
                          ) : (
                              <div className="text-center text-xs text-gray-400 py-10">No follow-up notes yet.</div>
                          )}
                          {lead.requirements && (!lead.followUps || lead.followUps.length === 0) && (
                              <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-amber-100 dark:border-gray-700 shadow-sm opacity-70">
                                 <p className="text-sm text-gray-600 dark:text-gray-300">{lead.requirements}</p>
                                 <p className="text-[10px] text-gray-400 mt-2">Original Requirement</p>
                              </div>
                          )}
                       </div>

                       <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Add new follow up..." 
                            className="w-full pl-3 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                          />
                          <button onClick={handleAddNote} disabled={!newNote.trim() || isSendingNote} className="absolute right-2 top-2 p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50">
                             <Send size={16}/>
                          </button>
                       </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[300px]">
                       <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 rounded-t-2xl">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> Activity Log</h3>
                       </div>
                       <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                          {lead.history?.slice().reverse().map((item, i) => (
                             <div key={i} className="flex gap-3 mb-6 last:mb-0 group">
                                <div className="flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-indigo-500 mt-1 shadow-md ring-4 ring-white dark:ring-gray-800"></div><div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 my-1"></div></div>
                                <div className="flex-1 min-w-0">
                                   <div className="text-xs text-gray-700 dark:text-gray-300 font-medium whitespace-pre-line break-words bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">{item.message}</div>
                                   <div className="flex justify-between items-center mt-1 px-1"><span className="text-[10px] font-bold text-indigo-500">{item.by?.split(' ')[0]}</span><span className="text-[10px] text-gray-400">{item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Just now'}</span></div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </motion.div>
    );
};

// --- COMPONENT: LEAD FORM MODAL (Unchanged) ---
const LeadFormModal = ({ isOpen, onClose, onSave, initialData, title }) => {
    const [activeTab, setActiveTab] = useState('basic');
    const [formData, setFormData] = useState({});
    const [newPayment, setNewPayment] = useState({ mode: 'UPI', date: '', amount: '' });

    const initialState = {
         name: '', phone: '', email: '', dob: '', location: '', gender: 'Male', source: '', 
         leadGenDate: new Date().toISOString().split('T')[0], confirmationDate: '', deliveryDate: '',
         status: 'New', conversionProbability: '50', leadClose: false,
         particular: '', unit: 'gm', weight: '', unitRate: '', skuNo: '', certificateNo: '', 
         metal: 'Gold', type: 'Ring', size: '', jewellerName: '', ornamentReady: false,
         productAmount: 0, makingCharges: 0, discount: 0, receivedAmount: 0, paymentHistory: [],
         courierCompany: '', courierDate: '', courierDocket: '', invoiceNo: '', exchange: false, remark: '', requirements: ''
    };

    useEffect(() => {
        if (isOpen) {
            setFormData({ ...initialState, ...(initialData || {}) });
            setActiveTab('basic');
        }
    }, [isOpen, initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const addPayment = () => {
         if(!newPayment.amount) return;
         setFormData(prev => ({ ...prev, paymentHistory: [...prev.paymentHistory, newPayment] }));
         setNewPayment({ mode: 'UPI', date: '', amount: '' });
    };

    const removePayment = (idx) => {
         setFormData(prev => ({ ...prev, paymentHistory: prev.paymentHistory.filter((_, i) => i !== idx) }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-800 w-full md:w-[95%] max-w-4xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 rounded-t-2xl">
                 <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Edit2 size={20} className="text-indigo-600"/> {title}</h2>
                 <button onClick={onClose}><X className="text-gray-400 hover:text-red-500 hover:rotate-90 transition-transform"/></button>
              </div>
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 overflow-x-auto">
                 {['basic', 'product', 'financial', 'logistics'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 px-2 text-xs font-bold uppercase tracking-wider transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-indigo-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                       {tab}
                       {activeTab === tab && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                    </button>
                 ))}
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                 {activeTab === 'basic' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">
                       <div className="col-span-full pb-2 border-b border-gray-100 dark:border-gray-700 mb-2 font-bold text-indigo-500 text-xs uppercase tracking-wider">Client Identity</div>
                       <Input name="name" label="Client Name *" val={formData.name} onChange={handleChange} />
                       <Input name="phone" label="Phone *" val={formData.phone} onChange={handleChange} />
                       <Select name="gender" label="Gender" val={formData.gender} onChange={handleChange} options={['Male', 'Female', 'Other']} />
                       <Input name="email" label="Email" val={formData.email} onChange={handleChange} />
                       <Input type="date" name="dob" label="Date of Birth" val={formData.dob} onChange={handleChange} />
                       <Input name="location" label="Location" val={formData.location} onChange={handleChange} />
                       <Input name="source" label="Source" val={formData.source} onChange={handleChange} />
                       <div className="col-span-full pb-2 border-b border-gray-100 dark:border-gray-700 mb-2 mt-4 font-bold text-indigo-500 text-xs uppercase tracking-wider">Dates & Status</div>
                       <Input type="date" name="leadGenDate" label="Gen. Date" val={formData.leadGenDate} onChange={handleChange} />
                       <Input type="date" name="confirmationDate" label="Confirm Date" val={formData.confirmationDate} onChange={handleChange} />
                       <Input type="date" name="deliveryDate" label="Delivery Date" val={formData.deliveryDate} onChange={handleChange} />
                       <Select name="status" label="Status" val={formData.status} onChange={handleChange} options={['New', 'Contacted', 'Consultation', 'Lead', 'Confirmed', 'Delivered', 'Refused', 'Lost']} />
                       <Input type="number" name="conversionProbability" label="Prob %" val={formData.conversionProbability} onChange={handleChange} />
                    </div>
                 )}
                 {activeTab === 'product' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">
                       <Input name="particular" label="Item Name" val={formData.particular} onChange={handleChange} />
                       <Input name="type" label="Type (Ring/Chain)" val={formData.type} onChange={handleChange} />
                       <Input name="metal" label="Metal (Gold/Silver)" val={formData.metal} onChange={handleChange} />
                       <Input name="weight" label="Weight" val={formData.weight} onChange={handleChange} />
                       <Select name="unit" label="Unit" val={formData.unit} onChange={handleChange} options={['gm', 'ct', 'kg']} />
                       <Input name="unitRate" label="Unit Rate" val={formData.unitRate} onChange={handleChange} />
                       <Input name="skuNo" label="SKU No" val={formData.skuNo} onChange={handleChange} />
                       <Input name="certificateNo" label="Cert. No" val={formData.certificateNo} onChange={handleChange} />
                       <Input name="size" label="Size" val={formData.size} onChange={handleChange} />
                       <Input name="jewellerName" label="Jeweller Name" val={formData.jewellerName} onChange={handleChange} />
                       <div className="flex items-center pt-6">
                          <input type="checkbox" name="ornamentReady" checked={formData.ornamentReady} onChange={handleChange} className="w-5 h-5 rounded text-indigo-600 mr-2" />
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Ornament Ready?</span>
                       </div>
                    </div>
                 )}
                 {activeTab === 'financial' && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <Input type="number" name="productAmount" label="Product Amt" val={formData.productAmount} onChange={handleChange} />
                          <Input type="number" name="makingCharges" label="Making Charges" val={formData.makingCharges} onChange={handleChange} />
                          <Input type="number" name="discount" label="Discount" val={formData.discount} onChange={handleChange} />
                       </div>
                       <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">Add Payment</h4>
                          <div className="flex flex-col sm:flex-row gap-3">
                             <select className="input-std w-full sm:w-32" value={newPayment.mode} onChange={e=>setNewPayment({...newPayment, mode:e.target.value})}><option>UPI</option><option>Cash</option><option>Card</option></select>
                             <input type="date" className="input-std" value={newPayment.date} onChange={e=>setNewPayment({...newPayment, date:e.target.value})} />
                             <input type="number" className="input-std flex-1" placeholder="Amount" value={newPayment.amount} onChange={e=>setNewPayment({...newPayment, amount:e.target.value})} />
                             <button onClick={addPayment} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-transform active:scale-95"><Plus/></button>
                          </div>
                          <div className="mt-4 space-y-2">
                             {formData.paymentHistory?.map((p, i) => (
                                <div key={i} className="flex justify-between text-sm bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 items-center">
                                   <span className="font-mono text-gray-500">{p.date} • {p.mode}</span> 
                                   <div className="flex items-center gap-3">
                                      <span className="font-bold text-green-600">{formatCurrency(p.amount)}</span> 
                                      <button onClick={()=>removePayment(i)} className="text-gray-300 hover:text-red-500 transition-colors"><X size={14}/></button>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 )}
                 {activeTab === 'logistics' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-300">
                       <Input name="courierCompany" label="Courier Co." val={formData.courierCompany} onChange={handleChange} />
                       <Input type="date" name="courierDate" label="Sent Date" val={formData.courierDate} onChange={handleChange} />
                       <Input name="courierDocket" label="Docket No" val={formData.courierDocket} onChange={handleChange} />
                       <Input name="invoiceNo" label="Invoice No" val={formData.invoiceNo} onChange={handleChange} />
                       <div className="md:col-span-2">
                          <label className="label">Remarks</label>
                          <textarea rows={3} name="remark" value={formData.remark} onChange={handleChange} className="input-std w-full"></textarea>
                       </div>
                       <div className="flex items-center mt-2 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                          <input type="checkbox" name="leadClose" checked={formData.leadClose} onChange={handleChange} className="w-5 h-5 rounded text-red-600 mr-3" />
                          <span className="text-sm font-bold text-red-600">Mark Lead as Closed?</span>
                       </div>
                    </div>
                 )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-white dark:bg-gray-800 rounded-b-2xl">
                 <button onClick={onClose} className="px-5 py-2 rounded-lg text-gray-500 hover:bg-gray-100 font-bold transition-colors">Cancel</button>
                 <button onClick={() => onSave(formData)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 flex items-center gap-2"><Save size={18}/> Save Data</button>
              </div>
           </motion.div>
        </div>
    );
};

// --- MAIN CONTROLLER ---
const LeadsManagementSystem = () => {
    const { userProfile } = useAuth();
    const { documents: leads } = useCollection('leads'); 
    const { documents: allUsers } = useCollection('users');

    const [selectedLead, setSelectedLead] = useState(null);
    const [editingLead, setEditingLead] = useState(null);
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);

    const [allowedUserIds, setAllowedUserIds] = useState([]);
    const [isLoadingPerms, setIsLoadingPerms] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const navigate = useNavigate(); 
    const fileInputRef = useRef(null);
    const role = userProfile?.role || 'employee';
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin';
    const canManageAccess = isSuperAdmin || isAdmin;

    // --- RBAC: Use onSnapshot for Real-time Access Updates ---
    useEffect(() => {
        const docRef = doc(db, 'settings', 'leads_access');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setAllowedUserIds(docSnap.data().uids || []);
            } else {
                // Initialize if doesn't exist
                setDoc(docRef, { uids: [] });
            }
            setIsLoadingPerms(false);
        }, (error) => {
            console.error("Perm Sync Error", error);
            setIsLoadingPerms(false);
        });

        return () => unsubscribe();
    }, []);

    const hasAccess = canManageAccess || allowedUserIds.includes(userProfile?.uid);

    // --- ACTIONS ---
    const handleSave = async (data) => {
        if (!data.name || !data.phone) return alert("Name & Phone required");
        try {
           const timestamp = new Date();
           const message = editingLead ? generateChangeLog(editingLead, data) : 'Lead Created';
           
           const historyItem = { 
              message: message, 
              timestamp, 
              by: userProfile.name || 'User' 
           };
           
           if (editingLead) {
              await updateDoc(doc(db, 'leads', editingLead.id), { ...data, history: arrayUnion(historyItem) });
              if(selectedLead?.id === editingLead.id) setSelectedLead({ ...selectedLead, ...data });
           } else {
              await addDoc(collection(db, 'leads'), { ...data, createdAt: serverTimestamp(), createdBy: userProfile.uid, history: [historyItem], appointments: [] });
           }
           setIsLeadModalOpen(false);
           setEditingLead(null);
        } catch (e) { console.error(e); alert("Save failed"); }
    };

    const handleDeleteLead = async (leadId) => {
        if (!window.confirm("Are you sure you want to delete this lead permanently?")) return;
        try {
            await deleteDoc(doc(db, 'leads', leadId));
            setSelectedLead(null);
            alert("Lead deleted successfully.");
        } catch (error) {
            console.error("Error deleting lead:", error);
            alert("Failed to delete lead. Check permissions.");
        }
    };

    const handleToggleUserAccess = async (targetUid) => {
        let newIds = allowedUserIds.includes(targetUid) 
          ? allowedUserIds.filter(id => id !== targetUid) 
          : [...allowedUserIds, targetUid];
        
        // Optimistic update handled by local state via onSnapshot, but we send write
        await setDoc(doc(db, 'settings', 'leads_access'), { uids: newIds }, { merge: true });
    };

    const EXCEL_HEADERS = [
        "S_No", "Client_Name", "Phone", "Email", "Gender", "Location", "Source",
        "DOB", 
        "Lead_Gen_Date", "Confirmation_Date", "Delivery_Date", "Status", "Conversion_Prob",
        "Item_Particular", "Metal", "Type", "Weight", "Unit", "Unit_Rate", "Size", 
        "SKU", "Certificate", "Jeweller", "Ornament_Ready",
        "Product_Amount", "Making_Charges", "Discount", "Received_Amount", "Due_Payment", "Payment_History",
        "Courier_Company", "Courier_Date", "Docket", "Invoice", 
        "Lead_Close", "Exchange", "Remark"
    ];

    const handleExportAll = () => {
         if(!leads?.length) return;
         const flatData = leads.map((l, i) => {
            const totalRec = l.paymentHistory?.reduce((s,p) => s + (parseFloat(p.amount)||0), 0) || 0;
            const totalDue = ((parseFloat(l.productAmount)||0) + (parseFloat(l.makingCharges)||0) - (parseFloat(l.discount)||0)) - totalRec;
            return {
               "S_No": i+1, "Client_Name": l.name, "Phone": l.phone, "Email": l.email, "Gender": l.gender, "Location": l.location, "Source": l.source,
               "DOB": l.dob, 
               "Lead_Gen_Date": l.leadGenDate, "Confirmation_Date": l.confirmationDate, "Delivery_Date": l.deliveryDate, "Status": l.status,
               "Conversion_Prob": l.conversionProbability, "Item_Particular": l.particular, "Metal": l.metal, "Type": l.type, "Weight": l.weight,
               "Unit": l.unit, "Unit_Rate": l.unitRate, "Size": l.size, "SKU": l.skuNo, "Certificate": l.certificateNo, "Jeweller": l.jewellerName,
               "Ornament_Ready": l.ornamentReady ? "Yes" : "No", "Product_Amount": l.productAmount, "Making_Charges": l.makingCharges, "Discount": l.discount,
               "Received_Amount": totalRec, "Due_Payment": totalDue, "Payment_History": l.paymentHistory?.map(p => `${p.date}:${p.amount}(${p.mode})`).join(', '),
               "Courier_Company": l.courierCompany, "Courier_Date": l.courierDate, "Docket": l.courierDocket, "Invoice": l.invoiceNo,
               "Lead_Close": l.leadClose ? "Yes" : "No", "Exchange": l.exchange ? "Yes" : "No", "Remark": l.remark
            };
         });
         const worksheet = XLSX.utils.json_to_sheet(flatData, { header: EXCEL_HEADERS });
         const workbook = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(workbook, worksheet, "Master_Leads");
         XLSX.writeFile(workbook, "All_Leads_Master.xlsx");
    };

    const handleExportSingle = (lead) => {
         const totalRec = lead.paymentHistory?.reduce((s,p) => s + (parseFloat(p.amount)||0), 0) || 0;
         const totalDue = ((parseFloat(lead.productAmount)||0) + (parseFloat(lead.makingCharges)||0) - (parseFloat(lead.discount)||0)) - totalRec;
         const singleData = [{
            "S_No": 1, "Client_Name": lead.name, "Phone": lead.phone, "Email": lead.email, "DOB": lead.dob, "Status": lead.status, "Product_Amount": lead.productAmount,
            "Due_Payment": totalDue, "Remark": lead.remark
         }]; 
         const worksheet = XLSX.utils.json_to_sheet(singleData);
         const workbook = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(workbook, worksheet, "Lead_Data");
         XLSX.writeFile(workbook, `${lead.name}_Data.xlsx`);
    };

    const handleImportClick = () => fileInputRef.current.click();
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                if (data.length === 0) return alert("Empty Excel file!");
                let count = 0;
                for (const row of data) {
                    const newLead = {
                        name: row["Client_Name"] || "Unknown", phone: row["Phone"] || "", email: row["Email"] || "", gender: row["Gender"] || "Male", dob: row["DOB"] || "",
                        location: row["Location"] || "", source: row["Source"] || "Imported", leadGenDate: row["Lead_Gen_Date"] || new Date().toISOString().split('T')[0],
                        confirmationDate: row["Confirmation_Date"] || "", deliveryDate: row["Delivery_Date"] || "", status: row["Status"] || "New",
                        conversionProbability: row["Conversion_Prob"] || "50", particular: row["Item_Particular"] || "", metal: row["Metal"] || "",
                        type: row["Type"] || "", weight: row["Weight"] || "", unit: row["Unit"] || "gm", unitRate: row["Unit_Rate"] || "", size: row["Size"] || "",
                        skuNo: row["SKU"] || "", certificateNo: row["Certificate"] || "", jewellerName: row["Jeweller"] || "", ornamentReady: row["Ornament_Ready"] === "Yes",
                        productAmount: row["Product_Amount"] || 0, makingCharges: row["Making_Charges"] || 0, discount: row["Discount"] || 0, paymentHistory: [],
                        courierCompany: row["Courier_Company"] || "", courierDate: row["Courier_Date"] || "", courierDocket: row["Docket"] || "", invoiceNo: row["Invoice"] || "",
                        leadClose: row["Lead_Close"] === "Yes", exchange: row["Exchange"] === "Yes", remark: row["Remark"] || "", requirements: "",
                        createdAt: serverTimestamp(), createdBy: userProfile.uid, history: [{ message: "Imported via Excel", timestamp: new Date(), by: userProfile.name }]
                    };
                    await addDoc(collection(db, 'leads'), newLead);
                    count++;
                }
                alert(`Success! Imported ${count} leads.`);
            } catch (err) { console.error(err); alert("Error parsing Excel file."); }
        };
        reader.readAsBinaryString(file);
        e.target.value = null; 
    };

    if (isLoadingPerms) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    
    if (!hasAccess) {
        return (
          <div className="h-screen bg-gray-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
             <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gray-800 p-10 rounded-3xl border border-gray-700 shadow-2xl text-center z-10 max-w-md">
                <div className="bg-red-500/20 p-6 rounded-full w-fit mx-auto mb-6"><Lock size={48} className="text-red-500" /></div>
                <h1 className="text-3xl font-bold mb-2">Restricted Access</h1>
                <p className="text-gray-400 mb-6">This module is locked. You do not have the required permissions to view Leads.</p>
                <div className="text-xs text-gray-500 uppercase tracking-widest border-t border-gray-700 pt-4">Contact Administrator</div>
             </motion.div>
          </div>
        );
    }

    return (
        <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden font-sans text-gray-800 dark:text-gray-100 relative">
           
           <AnimatePresence>
             {selectedLead && (
                <LeadDetailView 
                   key="detail"
                   lead={selectedLead} 
                   onClose={() => setSelectedLead(null)} 
                   onEdit={(l) => { setEditingLead(l); setIsLeadModalOpen(true); }}
                   onExportSingle={handleExportSingle}
                   onDelete={handleDeleteLead} 
                   canManage={canManageAccess}
                   userProfile={userProfile} 
                />
             )}
           </AnimatePresence>
           
           <AnimatePresence>
             {isBirthdayModalOpen && <BirthdayReportModal isOpen={isBirthdayModalOpen} onClose={()=>setIsBirthdayModalOpen(false)} leads={leads} />}
           </AnimatePresence>

           {/* MAIN DASHBOARD */}
           <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center p-4 sticky top-0 z-10 gap-4">
                 <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-500/30"><Users size={20}/></div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-400 flex items-center gap-2">
                       Leads <span className="text-indigo-600">Pro</span>
                       {isSuperAdmin && <Crown size={16} className="text-amber-500"/>}
                    </h1>
                 </div>
                 <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    
                    <button onClick={() => setIsBirthdayModalOpen(true)} className="flex-1 md:flex-none justify-center px-4 py-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/40 rounded-lg font-bold text-sm transition-all border border-pink-200 dark:border-pink-800 shadow-sm flex items-center gap-2">
                       <Cake size={16}/> Birthdays
                    </button>

                    <button onClick={() => navigate('/admin/appointments')} className="flex-1 md:flex-none justify-center px-4 py-2 bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600 rounded-lg font-bold text-sm transition-all border border-indigo-100 dark:border-gray-600 shadow-sm flex items-center gap-2">
                       <Calendar size={16}/> <span className="hidden sm:inline">Appointments</span>
                    </button>
                    
                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button onClick={handleImportClick} className="flex-1 md:flex-none justify-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg font-bold text-sm transition-colors border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                       <Upload size={16}/> <span className="hidden sm:inline">Import</span>
                    </button>

                    <button onClick={handleExportAll} className="flex-1 md:flex-none justify-center px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-bold text-sm transition-colors border border-green-200 flex items-center gap-2">
                       <FileText size={16}/> <span className="hidden sm:inline">Export</span>
                    </button>
                    {canManageAccess && (
                       <button onClick={() => setIsAccessModalOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition-colors" title="Manage Access">
                          <ShieldCheck size={20} />
                       </button>
                    )}
                    <button onClick={() => { setEditingLead(null); setIsLeadModalOpen(true); }} className="flex-1 md:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 flex items-center gap-2">
                       <Plus size={18}/> <span className="hidden sm:inline">New Lead</span>
                    </button>
                 </div>
              </div>

              <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                 <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-full lg:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-10 h-full lg:h-auto">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                       <div className="relative group">
                          <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                          <input placeholder="Search clients..." className="w-full bg-gray-50 dark:bg-gray-900 pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent focus:bg-white dark:focus:bg-gray-800" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                       </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                       {leads?.filter(l=>l.name.toLowerCase().includes(searchTerm.toLowerCase())).map((lead, i) => (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            key={lead.id} 
                            className={`p-3.5 rounded-xl cursor-pointer border transition-all duration-200 group relative overflow-hidden ${selectedLead?.id === lead.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 shadow-md' : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            onClick={() => setSelectedLead(lead)}
                          >
                             {selectedLead?.id === lead.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>}
                             <div className="flex justify-between items-start">
                                <h4 className={`font-bold text-sm ${selectedLead?.id === lead.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>{lead.name}</h4>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${lead.status==='Converted'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{lead.status}</span>
                             </div>
                             <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Phone size={10}/> {lead.phone}</p>
                          </motion.div>
                       ))}
                    </div>
                 </motion.div>

                 <div className="hidden lg:flex flex-1 bg-gray-50/50 dark:bg-gray-900 flex-col items-center justify-center text-center p-10">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 p-8 rounded-full shadow-2xl mb-6 ring-8 ring-gray-50 dark:ring-gray-800">
                       <Users size={64} className="text-indigo-300"/>
                    </motion.div>
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Select a Lead</h2>
                    <p className="text-gray-500 mt-2 max-w-md">View detailed analytics, timeline, and manage orders from the sidebar.</p>
                 </div>
              </div>
           </div>

           <AnimatePresence>
             {isLeadModalOpen && <LeadFormModal isOpen={isLeadModalOpen} onClose={()=>setIsLeadModalOpen(false)} onSave={handleSave} initialData={editingLead} title={editingLead?"Edit Lead":"Create Lead"} />}
           </AnimatePresence>

           <AnimatePresence>
             {isAccessModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                   <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30">
                         <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2"><ShieldCheck className="text-indigo-500" /> Access Control</h2>
                         <button onClick={() => setIsAccessModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                      </div>
                      <div className="p-6 overflow-y-auto custom-scrollbar max-h-[60vh]">
                         <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800 mb-4 flex gap-3">
                            <AlertCircle className="text-amber-500 shrink-0" size={20}/>
                            <p className="text-xs text-amber-700 dark:text-amber-400">Select employees who can view and edit Leads. Admins have access by default.</p>
                         </div>
                         <div className="space-y-2">
                            {allUsers && allUsers.filter(u => u.role !== 'admin' && u.role !== 'super_admin').map(emp => (
                               <label key={emp.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                                  <div className="flex items-center gap-3">
                                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${allowedUserIds.includes(emp.id) ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>{emp.name?.charAt(0) || 'U'}</div>
                                     <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{emp.name || emp.email}</span>
                                  </div>
                                  <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${allowedUserIds.includes(emp.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                     {allowedUserIds.includes(emp.id) && <Check size={14} className="text-white" />}
                                  </div>
                                  <input type="checkbox" className="hidden" checked={allowedUserIds.includes(emp.id)} onChange={() => handleToggleUserAccess(emp.id)} />
                               </label>
                            ))}
                         </div>
                      </div>
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 text-right border-t border-gray-200 dark:border-gray-700">
                         <button onClick={() => setIsAccessModalOpen(false)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-colors">Done</button>
                      </div>
                   </motion.div>
                </div>
             )}
           </AnimatePresence>

           <style>{`
             .input-std { width: 100%; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.6rem 0.8rem; font-size: 0.875rem; outline: none; transition: all 0.2s; }
             .input-std:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); background: white; }
             .custom-scrollbar::-webkit-scrollbar { width: 5px; }
             .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
             .scrollbar-hide::-webkit-scrollbar { display: none; }
             .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
             .bg-dots-pattern { background-image: radial-gradient(#e5e7eb 1px, transparent 1px); background-size: 20px 20px; }
             .dark .bg-dots-pattern { background-image: radial-gradient(#374151 1px, transparent 1px); }
           `}</style>
        </div>
    );
};

// UI Helpers
const Input = ({ label, name, val, onChange, type="text" }) => (
   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 tracking-wide">{label}</label><input type={type} name={name} value={val || ''} onChange={onChange} className="input-std" /></div>
);
const Select = ({ label, name, val, onChange, options }) => (
   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 tracking-wide">{label}</label><select name={name} value={val || ''} onChange={onChange} className="input-std">{options.map(o=><option key={o}>{o}</option>)}</select></div>
);
const StatCard = ({ label, value, icon: Icon, color }) => (
   <div className={`p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm ${color ? 'bg-white dark:bg-gray-800' : 'bg-white dark:bg-gray-800'}`}>
      <div className={`p-2 rounded-full mb-2 ${color || 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}><Icon size={18} /></div>
      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{label}</span>
      <span className="font-bold text-sm text-gray-800 dark:text-white mt-1">{value}</span>
   </div>
);
const DetailRow = ({ label, value, color, fontMono, highlight }) => (
   <div className={`flex justify-between items-center p-2 rounded transition-colors ${highlight ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
      <span className="text-gray-500 text-xs font-medium uppercase">{label}</span>
      <span className={`text-sm font-bold ${color || 'text-gray-800 dark:text-gray-200'} ${fontMono ? 'font-mono tracking-tight' : ''}`}>{value || '-'}</span>
   </div>
);

export default LeadsManagementSystem;

// still cant have a access try to fix it 
//    // 10. LEADS
//     match /leads/{leadId} {
//       allow read, create, update: if isAdmin() || hasAccess('leads_access');
//       allow delete: if isAdmin();
//     }