// src/components/common/OfficeData.jsx (MODERN UI & RESPONSIVE)

import React, { useState, useMemo, useRef } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 

// ----------------------------------------------------------------------
// 📂 COMPONENT: FOLDER/SHEET LIST VIEWER
// ----------------------------------------------------------------------
const FolderBrowser = ({ parentId, parentName, onSelect, onBack, isRoot }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFields, setNewFields] = useState(['Name', 'Contact Number', 'Address']); 
    
    const folderFilters = useMemo(() => [['parentId', '==', parentId]], [parentId]);
    const { data: items, loading, addDocument, deleteDocument } = useFirestore('office_folders', folderFilters);
    
    const fileInputRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);
    const { addDocument: addDataEntry } = useFirestore('office_data');

    // --- EXCEL IMPORT (Functionality Unchanged) ---
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
                const cleanData = rawData.map(row => { const r = {}; fields.forEach(f => r[f] = row[f] || ''); return r; });
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
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b pb-4">
                <div className="flex items-center gap-3">
                    {!isRoot && (
                        <button onClick={onBack} className="bg-gray-200 hover:bg-gray-300 p-2 rounded-full transition shadow-sm">
                            ⬅
                        </button>
                    )}
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                            {isRoot ? "🗄️ Office Data" : `📂 ${parentName}`}
                        </h2>
                        <p className="text-xs md:text-sm text-gray-500">
                            {isRoot ? "Manage Workbooks & Folders" : "Manage Sheets inside"}
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {isRoot && (
                        <>
                            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                            <button 
                                onClick={() => fileInputRef.current.click()} 
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:bg-emerald-700 transition text-sm font-semibold flex items-center gap-2 flex-1 md:flex-none justify-center"
                            >
                                📊 Import Excel
                            </button>
                        </>
                    )}
                    <button 
                        onClick={() => setIsCreating(true)} 
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition text-sm font-semibold flex-1 md:flex-none justify-center"
                    >
                        + New {isRoot ? 'Folder' : 'Sheet'}
                    </button>
                </div>
            </div>

            {/* Create Form (Modal Style) */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-fade-in-down">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">Create New {isRoot ? 'Folder' : 'Sheet'}</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold mb-1 text-gray-600">{isRoot ? "Folder Name" : "Sheet Name"}</label>
                            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder={isRoot ? "e.g. Vendor Data" : "e.g. Sheet 1"} />
                        </div>
                        
                        {!isRoot && (
                            <div className="mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                                <label className="block text-sm font-semibold mb-2 text-gray-600">Define Columns</label>
                                {newFields.map((f, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <input type="text" value={f} onChange={(e) => handleFieldChange(i, e.target.value)} className="flex-1 p-2 border rounded text-sm" placeholder={`Column ${i+1}`} />
                                    </div>
                                ))}
                                <button onClick={handleAddField} className="text-xs text-blue-600 font-bold hover:underline">+ Add Column</button>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end mt-4">
                            <button onClick={() => setIsCreating(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">Cancel</button>
                            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid View */}
            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items?.map(item => (
                        <div key={item.id} onClick={() => onSelect(item)} className={`p-5 rounded-xl shadow-sm hover:shadow-md transition border cursor-pointer group relative flex flex-col justify-between h-32 ${item.type === 'workbook' ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-100'}`}>
                            <div>
                                <div className="text-3xl mb-2">{item.type === 'workbook' ? '📁' : '📄'}</div>
                                <h3 className="font-bold text-gray-800 truncate text-sm md:text-base" title={item.name}>{item.name}</h3>
                                <p className="text-xs text-gray-500 mt-1 truncate">{item.type === 'workbook' ? 'Folder / Group' : `${item.fields?.length || 0} Columns`}</p>
                            </div>
                            
                            {/* Action Buttons (Visible on Hover/Touch) */}
                            <div className="absolute top-3 right-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                                {item.type === 'workbook' && (
                                    <button 
                                        onClick={(e) => handleDownloadWorkbook(e, item)} 
                                        title="Download" 
                                        className="bg-white text-green-600 hover:text-green-800 p-1.5 rounded-full shadow-sm border border-gray-100"
                                    >
                                        📥
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => handleDelete(e, item.id)} 
                                    className="bg-white text-red-400 hover:text-red-600 p-1.5 rounded-full shadow-sm border border-gray-100"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                    {items?.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            {isRoot ? "No folders yet. Start by creating one!" : "No sheets inside this folder."}
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

    const dataFilters = useMemo(() => [['folderId', '==', folder.id]], [folder.id]);
    const { data: rawFolderData, loading, addDocument, updateDocument, deleteDocument } = useFirestore('office_data', dataFilters);

    const folderData = useMemo(() => {
        if (!rawFolderData) return [];
        const sorted = [...rawFolderData].sort((a, b) => {
            if (a._sortIndex !== undefined && b._sortIndex !== undefined) return a._sortIndex - b._sortIndex;
            return (a.createdAt?.toDate ? a.createdAt.toDate() : 0) - (b.createdAt?.toDate ? b.createdAt.toDate() : 0);
        });
        if (!searchQuery.trim()) return sorted;
        return sorted.filter(row => folder.fields.some(field => String(row[field] || '').toLowerCase().includes(searchQuery.toLowerCase())));
    }, [rawFolderData, searchQuery, folder.fields]);

    const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) await updateDocument(editingId, { ...formData, updatedAt: new Date() });
            else await addDocument({ ...formData, folderId: folder.id, createdAt: new Date(), _sortIndex: Date.now() });
            setIsAdding(false); setEditingId(null); setFormData({});
        } catch (err) { alert("Error: " + err.message); }
    };

    const handleEdit = (record) => {
        setFormData(record);
        setEditingId(record.id);
        setIsAdding(true);
    };

    const handleAddColumn = async () => {
        if (!newColumnName.trim()) return alert("Column name cannot be empty!");
        if (folder.fields.includes(newColumnName)) return alert("Column already exists!");
        try {
            const folderRef = doc(db, 'office_folders', folder.id);
            await updateDoc(folderRef, { fields: [...folder.fields, newColumnName] });
            setIsAddingColumn(false); setNewColumnName('');
            alert("Column Added!"); onBack(); 
        } catch (error) { console.error(error); alert("Failed to add column."); }
    };

    const handleDeleteColumn = async (columnName) => {
        if (!window.confirm(`Delete column "${columnName}"? Data will be hidden.`)) return;
        try {
            const updatedFields = folder.fields.filter(f => f !== columnName);
            const folderRef = doc(db, 'office_folders', folder.id);
            await updateDoc(folderRef, { fields: updatedFields });
            alert("Column Deleted!"); onBack();
        } catch (error) { console.error(error); alert("Failed to delete column."); }
    };

    const handleDownloadExcel = () => {
        if (!folderData.length) return alert("No data!");
        const exportData = folderData.map(row => { const r = {}; folder.fields.forEach(f => r[f] = row[f] || ''); return r; });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${folder.name}.xlsx`);
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 min-h-screen">
            
            {/* Header Actions */}
            <div className="flex flex-col gap-4 border-b pb-4 mb-4 bg-white p-4 rounded-xl shadow-sm">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition">⬅</button>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">📄 {folder.name}</h2>
                            <span className="text-[10px] uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Sheet</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-green-700 text-sm whitespace-nowrap">📊 Export</button>
                        <button onClick={() => setIsAddingColumn(true)} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-purple-700 text-sm whitespace-nowrap">+ Column</button>
                        <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({}); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-blue-700 text-sm whitespace-nowrap">+ Row</button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder="Search data..." 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                    />
                </div>
            </div>

            {/* Modals */}
            {isAddingColumn && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm animate-fade-in-down">
                        <h3 className="font-bold text-lg mb-4 text-purple-800">Add New Column</h3>
                        <input type="text" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} className="w-full p-2 border rounded-lg mb-4" placeholder="Column Name" />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsAddingColumn(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Cancel</button>
                            <button onClick={handleAddColumn} className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow text-sm">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {isAdding && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-down">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="font-bold text-lg text-gray-800">{editingId ? '✏️ Edit Entry' : '➕ Add Entry'}</h3>
                            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-red-500 text-xl">✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {folder.fields.map((field) => (
                                    <div key={field}>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">{field}</label>
                                        <input type="text" value={formData[field] || ''} onChange={(e) => handleInputChange(field, e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder={`Enter ${field}`} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 justify-end sticky bottom-0 bg-white pt-2 border-t">
                                <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium text-sm hover:bg-gray-300">Cancel</button>
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 font-bold text-sm">{editingId ? 'Update' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    {loading ? <LoadingSpinner /> : (
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {folder.fields.map(f => (
                                        <th key={f} className="p-3 whitespace-nowrap font-semibold text-gray-600 text-sm border-r border-gray-100 bg-gray-50 group">
                                            <div className="flex justify-between items-center gap-2">
                                                <span>{f}</span>
                                                <button onClick={() => handleDeleteColumn(f)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition" title="Delete Column">✕</button>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-3 bg-gray-50 w-24 text-center font-bold text-gray-600 sticky right-0 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] z-20">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {folderData.length > 0 ? (
                                    folderData.map(row => (
                                        <tr key={row.id} className="hover:bg-blue-50/50 transition duration-150 group">
                                            {folder.fields.map(f => (
                                                <td key={f} className="p-3 text-sm text-gray-700 border-r border-gray-50 max-w-[200px] truncate" title={row[f]}>{row[f] || '-'}</td>
                                            ))}
                                            <td className="p-3 flex justify-center gap-3 sticky right-0 bg-white group-hover:bg-blue-50/50 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)]">
                                                <button onClick={() => handleEdit(row)} className="text-blue-500 hover:text-blue-700 font-medium p-1 rounded hover:bg-blue-100" title="Edit">✏️</button>
                                                <button onClick={() => window.confirm("Delete this row?") && deleteDocument(row.id)} className="text-red-400 hover:text-red-600 font-medium p-1 rounded hover:bg-red-100" title="Delete">🗑️</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={folder.fields.length + 1} className="p-10 text-center text-gray-400 italic bg-gray-50/30">No data found. Add a new row to get started.</td></tr>
                                )}
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