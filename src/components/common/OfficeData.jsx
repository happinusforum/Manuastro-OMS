// src/components/common/OfficeData.jsx (FINAL FIXED: Sorting & Zero Handling)

import React, { useState, useMemo, useRef } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch, addDoc } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 
import ExcelEditor from './ExcelEditor'; 

// ----------------------------------------------------------------------
// 🛠️ HELPER: DATE SORTER
// ----------------------------------------------------------------------
const getTimestamp = (t) => {
    if (!t) return 0;
    if (typeof t.toDate === 'function') return t.toDate().getTime(); // Firestore Timestamp
    if (t instanceof Date) return t.getTime(); // JS Date (Local)
    return new Date(t).getTime() || 0; // String/Other
};

// ----------------------------------------------------------------------
// 📂 COMPONENT: FOLDER/SHEET LIST VIEWER
// ----------------------------------------------------------------------
const FolderBrowser = ({ parentId, parentName, onSelect, onBack, isRoot }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFields, setNewFields] = useState(['Name', 'Contact Number', 'Address']); 
    
    const folderFilters = useMemo(() => [['parentId', '==', parentId]], [parentId]);
    const { data: rawItems, loading, addDocument, deleteDocument } = useFirestore('office_folders', folderFilters);
    
    // 🛠️ FIX: Sort Folders (Newest at Bottom)
    const items = useMemo(() => {
        if(!rawItems) return [];
        return [...rawItems].sort((a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt));
    }, [rawItems]);

    const fileInputRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);
    const { addDocument: addDataEntry } = useFirestore('office_data');

    // --- EXCEL IMPORT ---
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsImporting(true);
        const fileName = file.name.replace(/\.[^/.]+$/, ""); 
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const parentFolderId = await addDocument({ name: fileName, type: 'workbook', parentId: 'ROOT', createdAt: new Date() });

                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonDataWithHeader = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    if (!jsonDataWithHeader || jsonDataWithHeader.length === 0) continue;
                    const headers = jsonDataWithHeader[0];
                    const rowData = XLSX.utils.sheet_to_json(sheet);
                    if (headers && headers.length > 0) {
                        const sheetId = await addDocument({ name: sheetName, type: 'sheet', parentId: parentFolderId, fields: headers, createdAt: new Date() });
                        const uploadPromises = rowData.map((row, index) => addDataEntry({ ...row, folderId: sheetId, createdAt: new Date(), _sortIndex: index }));
                        await Promise.all(uploadPromises);
                    }
                }
                alert(`Success! File "${fileName}" imported.`);
            } catch (error) { console.error(error); alert("Error importing: " + error.message); } 
            finally { setIsImporting(false); if(fileInputRef.current) fileInputRef.current.value = ""; }
        };
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if(window.confirm("Delete this item and all contents?")) await deleteDocument(id);
    };

    const handleDownloadWorkbook = async (e, workbookItem) => {
        e.stopPropagation();
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const wb = XLSX.utils.book_new();
            const sheetsQuery = query(collection(db, 'office_folders'), where('parentId', '==', workbookItem.id));
            const sheetsSnapshot = await getDocs(sheetsQuery);
            if (sheetsSnapshot.empty) { alert("No sheets found."); setIsDownloading(false); return; }
            for (const sheetDoc of sheetsSnapshot.docs) {
                const sheetInfo = sheetDoc.data();
                const sheetName = sheetInfo.name || 'Sheet';
                const sheetId = sheetDoc.id;
                const fields = sheetInfo.fields || [];
                const dataQuery = query(collection(db, 'office_data'), where('folderId', '==', sheetId));
                const dataSnapshot = await getDocs(dataQuery);
                const rawData = dataSnapshot.docs.map(doc => doc.data());
                rawData.sort((a, b) => (a._sortIndex || 0) - (b._sortIndex || 0));
                
                // 🛠️ FIX: Handle 0 in Download
                const cleanData = rawData.map(row => { 
                    const r = {}; 
                    fields.forEach(f => {
                        const val = row[f];
                        r[f] = (val !== undefined && val !== null) ? val : '';
                    }); 
                    return r; 
                });
                
                const ws = XLSX.utils.json_to_sheet(cleanData);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
            XLSX.writeFile(wb, `${workbookItem.name}.xlsx`);
        } catch (error) { console.error(error); alert("Download Failed."); } 
        finally { setIsDownloading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) { alert("Name is required!"); return; }
        if (isRoot) {
            await addDocument({ name: newFolderName, type: 'workbook', parentId: 'ROOT', createdAt: new Date() });
        } else {
            const cleanedFields = newFields.filter(f => f.trim() !== '');
            if (cleanedFields.length === 0) { alert("Sheet needs at least one column!"); return; }
            await addDocument({ name: newFolderName, type: 'sheet', parentId: parentId, fields: cleanedFields, createdAt: new Date() });
        }
        setIsCreating(false); setNewFolderName(''); setNewFields(['Name', 'Contact Number', 'Address']);
    };

    const handleAddField = () => setNewFields([...newFields, '']);
    const handleFieldChange = (i, v) => { const u = [...newFields]; u[i] = v; setNewFields(u); };

    if (isImporting || isDownloading) return <LoadingSpinner message={isDownloading ? "Generating Excel File..." : "Processing Import..."} />;

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                    {!isRoot && (
                        <button onClick={onBack} className="bg-white hover:bg-gray-100 text-gray-600 p-2 rounded-full transition shadow-sm border border-gray-200">⬅</button>
                    )}
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                            {isRoot ? "🗄️ Office Data" : `📂 ${parentName}`}
                        </h2>
                        <p className="text-xs md:text-sm text-gray-500 mt-1">
                            {isRoot ? "Manage Workbooks & Folders" : "Manage Sheets inside"}
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {isRoot && (
                        <>
                            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                            <button onClick={() => fileInputRef.current.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition text-sm font-semibold flex items-center gap-2 flex-1 md:flex-none justify-center">
                                📊 Import Excel
                            </button>
                        </>
                    )}
                    <button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition text-sm font-semibold flex-1 md:flex-none justify-center">
                        + New {isRoot ? 'Folder' : 'Sheet'}
                    </button>
                </div>
            </div>

            {isCreating && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-fade-in-down border border-gray-100">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">Create New {isRoot ? 'Folder' : 'Sheet'}</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold mb-1 text-gray-600">{isRoot ? "Folder Name" : "Sheet Name"}</label>
                            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder={isRoot ? "e.g. Vendor Data" : "e.g. Sheet 1"} />
                        </div>
                        {!isRoot && (
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold text-gray-600">Define Columns</label>
                                    <button onClick={handleAddField} className="text-xs text-blue-600 font-bold hover:underline">+ Add Column</button>
                                </div>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 rounded-lg p-2 bg-gray-50">
                                    {newFields.map((f, i) => (
                                        <div key={i} className="flex gap-2 mb-2 last:mb-0">
                                            <input type="text" value={f} onChange={(e) => handleFieldChange(i, e.target.value)} className="flex-1 p-2 border border-gray-300 rounded text-sm focus:border-blue-400 outline-none" placeholder={`Column ${i+1}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
                            <button onClick={() => setIsCreating(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm">Cancel</button>
                            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md font-medium text-sm">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items?.map(item => (
                        <div key={item.id} onClick={() => onSelect(item)} className={`group relative p-5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-36 ${item.type === 'workbook' ? 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md' : 'bg-white border-gray-200 hover:border-green-400 hover:shadow-md'}`}>
                            <div>
                                <div className={`text-3xl mb-3 w-12 h-12 flex items-center justify-center rounded-lg ${item.type === 'workbook' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}>
                                    {item.type === 'workbook' ? '📁' : '📄'}
                                </div>
                                <h3 className="font-bold text-gray-800 truncate text-base mb-1" title={item.name}>{item.name}</h3>
                                <p className="text-xs text-gray-500 truncate">{item.type === 'workbook' ? 'Folder / Group' : `${item.fields?.length || 0} Columns`}</p>
                            </div>
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {item.type === 'workbook' && (
                                    <button onClick={(e) => handleDownloadWorkbook(e, item)} title="Download Excel" className="bg-white text-green-600 hover:text-green-700 hover:bg-green-50 p-1.5 rounded-md shadow-sm border border-gray-200 transition">📥</button>
                                )}
                                <button onClick={(e) => handleDelete(e, item.id)} title="Delete" className="bg-white text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md shadow-sm border border-gray-200 transition">🗑️</button>
                            </div>
                        </div>
                    ))}
                    {items?.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <span className="text-4xl mb-2">📭</span>
                            <p className="text-sm font-medium">{isRoot ? "No folders yet. Start by creating one!" : "No sheets inside this folder."}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 📄 COMPONENT: DATA TABLE VIEW
// ----------------------------------------------------------------------
const FolderDataView = ({ folder, onBack }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showExcelEditor, setShowExcelEditor] = useState(false); 

    const dataFilters = useMemo(() => [['folderId', '==', folder.id]], [folder.id]);
    const { data: rawFolderData, loading, addDocument, updateDocument, deleteDocument } = useFirestore('office_data', dataFilters);

    // 🟢 1. Prepare Data for ExcelEditor (LOAD)
    const excelInitialData = useMemo(() => {
        if (!rawFolderData || !folder.fields) return [];
        const celldata = [];
        
        folder.fields.forEach((field, colIndex) => {
            celldata.push({
                r: 0, c: colIndex, v: { v: field, m: field, ct: { fa: "General", t: "g" }, bg: "#f3f4f6", bl: 1 }
            });
        });

        // 🛠️ FIX: Sort for Excel consistent with Table
        const sortedForExcel = [...rawFolderData].sort((a, b) => {
            if (a._sortIndex !== undefined && b._sortIndex !== undefined) return a._sortIndex - b._sortIndex;
            return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
        });

        sortedForExcel.forEach((row, rowIndex) => {
            folder.fields.forEach((field, colIndex) => {
                let value = row[field];
                if (value === undefined || value === null) value = "";
                celldata.push({
                    r: rowIndex + 1, c: colIndex,
                    v: { v: value, m: String(value), ct: { fa: "General", t: typeof value === 'number' ? "n" : "g" } }
                });
            });
        });
        return [{ name: "Sheet1", celldata: celldata }];
    }, [rawFolderData, folder.fields]);

    // 🟢 2. Save Data from ExcelEditor (SAVE)
    const handleExcelSave = async (allSheets) => {
        if (!allSheets || !allSheets[0].data) return;
        const sheetData = allSheets[0].data; 
        try {
            const newFields = [];
            const headerRow = sheetData[0];
            if(headerRow) {
                for(let c = 0; c < headerRow.length; c++) {
                    if(headerRow[c]?.v) newFields.push(String(headerRow[c].v));
                    else break; 
                }
            }
            if (newFields.length === 0) return alert("Headers required.");

            const newRows = [];
            for(let r = 1; r < sheetData.length; r++) {
                const row = sheetData[r];
                if(!row) continue;
                const rowObject = { folderId: folder.id, createdAt: new Date(), _sortIndex: r };
                let hasData = false;
                newFields.forEach((field, cIndex) => {
                    const cell = row[cIndex];
                    // 🛠️ FIX: Allow 0 to be saved
                    if(cell && (cell.v !== null && cell.v !== undefined)) {
                        rowObject[field] = cell.v;
                        hasData = true;
                    }
                });
                if(hasData) newRows.push(rowObject);
            }

            const batch = writeBatch(db);
            rawFolderData.forEach(d => batch.delete(doc(db, 'office_data', d.id)));
            newRows.forEach(r => batch.set(doc(collection(db, "office_data")), r));
            batch.update(doc(db, 'office_folders', folder.id), { fields: newFields });
            await batch.commit();
            setShowExcelEditor(false);
            alert("✅ Synced!");
        } catch (error) { alert("Sync Failed: " + error.message); }
    };

    // 🛠️ FIX: SORT DATA (Newest Last)
    const folderData = useMemo(() => {
        if (!rawFolderData) return [];
        const sorted = [...rawFolderData].sort((a, b) => {
            // Priority 1: Sort Index (from Excel)
            if (a._sortIndex !== undefined && b._sortIndex !== undefined) return a._sortIndex - b._sortIndex;
            // Priority 2: Creation Time (Ascending = Oldest Top, Newest Bottom)
            return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
        });
        if (!searchQuery.trim()) return sorted;
        return sorted.filter(row => folder.fields.some(field => String(row[field] || '').toLowerCase().includes(searchQuery.toLowerCase())));
    }, [rawFolderData, searchQuery, folder.fields]);

    const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDocument(editingId, { ...formData, updatedAt: new Date() });
            } else {
                // 🛠️ FIX: Calculate Sort Index for new row to be at BOTTOM
                const maxIndex = rawFolderData.reduce((max, item) => Math.max(max, item._sortIndex || 0), 0);
                await addDocument({ 
                    ...formData, 
                    folderId: folder.id, 
                    createdAt: new Date(), 
                    _sortIndex: maxIndex + 1 
                });
            }
            setIsAdding(false); setEditingId(null); setFormData({});
        } catch (err) { alert("Error: " + err.message); }
    };

    const handleEdit = (record) => { setFormData(record); setEditingId(record.id); setIsAdding(true); };
    const handleAddColumn = async () => { /* ...Same as before... */ if (!newColumnName.trim()) return alert("Name required"); try { await updateDoc(doc(db, 'office_folders', folder.id), { fields: [...folder.fields, newColumnName] }); setIsAddingColumn(false); setNewColumnName(''); } catch (err) { alert("Failed"); }};
    const handleDeleteColumn = async (columnName) => { /* ...Same as before... */ if (!window.confirm("Delete?")) return; try { await updateDoc(doc(db, 'office_folders', folder.id), { fields: folder.fields.filter(f => f !== columnName) }); } catch (err) { alert("Failed"); }};

    const handleDownloadExcel = () => {
        if (!folderData.length) return alert("No data!");
        // 🛠️ FIX: Export 0 properly
        const exportData = folderData.map(row => { 
            const r = {}; 
            folder.fields.forEach(f => r[f] = (row[f] !== undefined && row[f] !== null) ? row[f] : ''); 
            return r; 
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${folder.name}.xlsx`);
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 min-h-screen">
            <div className="flex flex-col gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition text-gray-600">⬅</button>
                        <div><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">📄 {folder.name}</h2><span className="text-[10px] uppercase bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded font-bold tracking-wider">Sheet Data</span></div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                        <button onClick={() => setShowExcelEditor(true)} className="bg-gray-800 text-white px-3 py-1.5 rounded-lg shadow hover:bg-gray-900 text-sm whitespace-nowrap font-medium flex items-center gap-2"><span>⚡</span> Advanced Mode</button>
                        <button onClick={handleDownloadExcel} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-emerald-700 text-sm whitespace-nowrap font-medium flex items-center gap-2"><span>📊</span> Export</button>
                        <button onClick={() => setIsAddingColumn(true)} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-purple-700 text-sm whitespace-nowrap font-medium">+ Column</button>
                        <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({}); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-blue-700 text-sm whitespace-nowrap font-medium">+ Row</button>
                    </div>
                </div>
                <div className="relative w-full"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search data..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition text-sm shadow-sm" /></div>
            </div>

            {showExcelEditor && <ExcelEditor initialData={excelInitialData} onSave={handleExcelSave} onClose={() => setShowExcelEditor(false)} />}

            {isAddingColumn && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm animate-fade-in-down border border-gray-100"><h3 className="font-bold text-lg mb-4 text-purple-800">Add New Column</h3><input type="text" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Column Name" /><div className="flex justify-end gap-3"><button onClick={() => setIsAddingColumn(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 font-medium">Cancel</button><button onClick={handleAddColumn} className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow text-sm hover:bg-purple-700 font-medium">Add</button></div></div></div>}

            {isAdding && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-down custom-scrollbar border border-gray-100"><div className="flex justify-between items-center mb-6 border-b pb-4"><h3 className="font-bold text-xl text-gray-800">{editingId ? '✏️ Edit Entry' : '➕ Add Entry'}</h3><button onClick={() => setIsAdding(false)} className="bg-gray-100 hover:bg-red-100 hover:text-red-500 p-2 rounded-full transition text-gray-500">✕</button></div><form onSubmit={handleSave}><div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">{folder.fields.map((field) => (<div key={field}><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">{field}</label><input type="text" value={formData[field] !== undefined ? formData[field] : ''} onChange={(e) => handleInputChange(field, e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-sm bg-gray-50 focus:bg-white" placeholder={`Enter ${field}`} /></div>))}</div><div className="flex gap-3 justify-end sticky bottom-0 bg-white pt-4 border-t border-gray-100"><button type="button" onClick={() => setIsAdding(false)} className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-200 transition">Cancel</button><button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg shadow-md hover:bg-blue-700 font-bold text-sm transition">{editingId ? 'Update Entry' : 'Save Entry'}</button></div></form></div></div>}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    {loading ? <LoadingSpinner /> : (
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm"><tr>{folder.fields.map(f => <th key={f} className="p-3 whitespace-nowrap font-semibold text-gray-600 text-sm border-r border-gray-200 bg-gray-50 group min-w-[150px]"><div className="flex justify-between items-center gap-2"><span>{f}</span><button onClick={() => handleDeleteColumn(f)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 rounded-full hover:bg-red-50" title="Delete Column">✕</button></div></th>)}<th className="p-3 bg-gray-50 w-24 text-center font-bold text-gray-600 sticky right-0 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] z-20 border-l border-gray-200">Action</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {folderData.length > 0 ? folderData.map(row => (
                                    <tr key={row.id} className="hover:bg-blue-50/30 transition duration-150 group">
                                        {folder.fields.map(f => (
                                            <td key={f} className="p-3 text-sm text-gray-700 border-r border-gray-50 max-w-[200px] truncate" title={row[f]}>
                                                {/* 🛠️ FIX: Correctly Display 0 */}
                                                {row[f] !== undefined && row[f] !== null && row[f] !== "" ? row[f] : <span className="text-gray-300 text-xs italic">Empty</span>}
                                            </td>
                                        ))}
                                        <td className="p-3 flex justify-center gap-2 sticky right-0 bg-white group-hover:bg-blue-50/30 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] border-l border-gray-50">
                                            <button onClick={() => handleEdit(row)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 p-1.5 rounded-md transition" title="Edit"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            <button onClick={() => window.confirm("Delete this row?") && deleteDocument(row.id)} className="text-red-400 hover:text-red-600 hover:bg-red-100 p-1.5 rounded-md transition" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={folder.fields.length + 1} className="p-12 text-center text-gray-400 italic bg-gray-50/10">No data found. Click "+ Row" to add entries.</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 🚀 MAIN CONTROLLER
// ----------------------------------------------------------------------
function OfficeData() {
    const [selectedFile, setSelectedFile] = useState(null); 
    const [selectedSheet, setSelectedSheet] = useState(null); 

    if (selectedSheet) return <FolderDataView folder={selectedSheet} onBack={() => setSelectedSheet(null)} />;
    if (selectedFile) return <FolderBrowser isRoot={false} parentId={selectedFile.id} parentName={selectedFile.name} onSelect={(item) => setSelectedSheet(item)} onBack={() => setSelectedFile(null)} />;
    return <div className="min-h-screen bg-gray-100"><FolderBrowser isRoot={true} parentId="ROOT" parentName="Office Data" onSelect={(item) => { if (item.type === 'workbook') setSelectedFile(item); else setSelectedSheet(item); }} onBack={null} /></div>;
}

export default OfficeData;