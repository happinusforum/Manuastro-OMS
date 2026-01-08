// src/pages/employee/MyLeaveStatus.jsx

import React, { useMemo, useState } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

// 🎨 Animation & Icons
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, Plane, MessageSquare, Clock, CheckCircle, 
    XCircle, FileSpreadsheet, Filter, AlertCircle, ArrowUpDown, Search
} from 'lucide-react';

function MyLeaveStatus() {
    const { currentUser } = useAuth();
    const [filterStatus, setFilterStatus] = useState('All');
    const [sortBy, setSortBy] = useState('newest'); 

    // 1. Fetch Data
    const filters = useMemo(() => {
        return currentUser ? [['userId', '==', currentUser.uid]] : [];
    }, [currentUser]);

    const { data: myLeaves, loading, error } = useFirestore('leaves', filters);

    // 🛠️ Helper: Date Formatter
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            if (timestamp instanceof Date) return timestamp.toLocaleDateString('en-GB');
            return new Date(timestamp).toLocaleDateString('en-GB');
        } catch (err) {
            return 'Invalid Date';
        }
    };

    // 🔍 Filtering & Sorting Logic
    const processedLeaves = useMemo(() => {
        if (!myLeaves) return [];

        // 1. Filter
        let result = myLeaves.filter(doc => {
            if (filterStatus === 'All') return true;
            if (filterStatus === 'Pending') return doc.status.includes('Pending');
            return doc.status === filterStatus;
        });

        // 2. Sort
        result.sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            const typeA = (a.leaveType || a.travelType || 'Query').toLowerCase();
            const typeB = (b.leaveType || b.travelType || 'Query').toLowerCase();

            switch (sortBy) {
                case 'newest': return dateB - dateA;
                case 'oldest': return dateA - dateB;
                case 'type': return typeA.localeCompare(typeB);
                case 'status':
                      const statusOrder = { 'Pending HR': 1, 'Pending': 1, 'Approved': 2, 'Rejected': 3 };
                      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
                default: return dateB - dateA;
            }
        });

        return result;
    }, [myLeaves, filterStatus, sortBy]);

    // 📊 Stats Calculation
    const stats = {
        total: myLeaves ? myLeaves.length : 0,
        pending: myLeaves ? myLeaves.filter(l => l.status.includes('Pending')).length : 0,
        approved: myLeaves ? myLeaves.filter(l => l.status === 'Approved').length : 0
    };

    // 📥 Download Report Logic
    const handleDownloadReport = () => {
        if (!myLeaves || myLeaves.length === 0) return alert("No data available to download.");
        
        const exportData = myLeaves.map(item => ({
            "Category": item.type.toUpperCase(),
            "Sub Type": item.leaveType || item.travelType || 'Query',
            "Start Date": item.startDate || '-',
            "End Date": item.endDate || '-',
            "Duration (Days)": item.days || '-',
            "Reason": item.reason,
            "Applied On": formatDate(item.createdAt),
            "Current Status": item.status,
            "Reviewed By": item.reviewedBy || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "My Requests");
        XLSX.writeFile(wb, `My_Requests_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // 🎨 UI Helper: Status Badge & Color (Dark Mode Adjusted)
    const getStatusConfig = (status) => {
        if (status === 'Approved') return { color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle size={16} /> };
        if (status === 'Rejected') return { color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle size={16} /> };
        return { color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock size={16} className="animate-pulse" /> };
    };

    // 🎨 UI Helper: Type Icon
    const getTypeIcon = (type) => {
        switch(type) {
            case 'leave': return <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Calendar size={20} /></div>;
            case 'travel': return <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"><Plane size={20} /></div>;
            default: return <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"><MessageSquare size={20} /></div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-300">
            
            {/* --- HEADER SECTION --- */}
            <div className="max-w-6xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight"> Leave Dashboard</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Track your leaves, travels, and queries history.</p>
                    </div>
                    <button 
                        onClick={handleDownloadReport}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl shadow-sm hover:shadow-md hover:text-green-600 dark:hover:text-green-400 transition-all active:scale-95"
                    >
                        <FileSpreadsheet size={18} /> Export Excel
                    </button>
                </div>

                {/* --- STATS CARDS --- */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl"><Filter size={24} /></div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Total Requests</p>
                            <h4 className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</h4>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl"><Clock size={24} /></div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Pending</p>
                            <h4 className="text-2xl font-bold text-gray-800 dark:text-white">{stats.pending}</h4>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl"><CheckCircle size={24} /></div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Approved</p>
                            <h4 className="text-2xl font-bold text-gray-800 dark:text-white">{stats.approved}</h4>
                        </div>
                    </div>
                </div>

                {/* --- CONTROLS: TABS & SORT --- */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-8 gap-4">
                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
                        {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                                ${filterStatus === status 
                                    ? 'bg-gray-800 dark:bg-indigo-600 text-white shadow-lg scale-105' 
                                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* 🟢 Sorting Dropdown */}
                    <div className="relative group w-full md:w-auto">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <ArrowUpDown size={16} />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full md:w-56 pl-10 pr-8 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl shadow-sm appearance-none hover:border-indigo-400 dark:hover:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-500 outline-none cursor-pointer transition-all"
                        >
                            <option value="newest">📅 Latest First</option>
                            <option value="oldest">📅 Oldest First</option>
                            <option value="type">🔤 By Type (A-Z)</option>
                            <option value="status">🚦 Priority Status</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- LIST CONTENT --- */}
            <div className="max-w-6xl mx-auto">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                        <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">Fetching your history...</p>
                    </div>
                )}

                {!loading && processedLeaves.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 transition-colors">
                        <div className="inline-block p-4 bg-gray-50 dark:bg-gray-700 rounded-full mb-4">
                            <Search size={32} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">No records found</h3>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">Try changing the filter or apply for a new one.</p>
                    </div>
                )}

                <div className="space-y-4">
                    <AnimatePresence>
                        {processedLeaves.map((item) => {
                            const statusConfig = getStatusConfig(item.status);
                            
                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    layout
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all relative overflow-hidden group"
                                >
                                    {/* Status Stripe (Left Border) */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusConfig.color.match(/bg-([a-z]+)-(\d+)/)?.[0] || 'bg-gray-200'}`}></div>

                                    <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between pl-3">
                                        
                                        {/* Left: Icon & Main Info */}
                                        <div className="flex items-start gap-4">
                                            {getTypeIcon(item.type)}
                                            <div>
                                                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg flex items-center gap-2">
                                                    {item.leaveType || item.travelType || 'General Query'}
                                                </h4>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider mt-1">
                                                    Applied: {formatDate(item.createdAt)}
                                                </p>
                                                
                                                {/* Mobile View: Reason preview */}
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-1 md:hidden">
                                                    {item.reason}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Center: Duration & Reason (Desktop) */}
                                        <div className="hidden md:block flex-1 px-8 border-l border-gray-100 dark:border-gray-700 ml-4">
                                            {(item.type === 'leave' || item.type === 'travel') ? (
                                                <div className="flex items-center gap-6">
                                                    <div>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">Duration</p>
                                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                                                            {formatDate(item.startDate)} <span className="text-gray-400 mx-1">➜</span> {formatDate(item.endDate)}
                                                        </p>
                                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded mt-1 inline-block">
                                                            {item.days} Days
                                                        </span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">Note</p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate max-w-xs" title={item.reason}>
                                                            {item.reason}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                     <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">Query Detail</p>
                                                     <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate" title={item.reason}>{item.reason}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: Status Badge */}
                                        <div className="flex items-center justify-between md:justify-end gap-4 mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-700">
                                            <div className="md:hidden">
                                                {/* Mobile Date Show */}
                                                {(item.type === 'leave' || item.type === 'travel') && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                                                    </p>
                                                )}
                                            </div>

                                            <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold ${statusConfig.color}`}>
                                                {statusConfig.icon}
                                                {item.status}
                                            </div>
                                        </div>

                                    </div>
                                    
                                    {/* Reviewer Note (Conditional) */}
                                    {item.status !== 'Pending HR' && item.reviewedBy && (
                                        <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2 pl-3">
                                            <AlertCircle size={12} />
                                            <span>Reviewed by <span className="font-medium text-gray-600 dark:text-gray-300">{item.reviewedBy}</span> on {formatDate(item.reviewedAt)}</span>
                                        </div>
                                    )}

                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default MyLeaveStatus;