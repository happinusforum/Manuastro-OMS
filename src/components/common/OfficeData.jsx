// src/components/common/OfficeData.jsx (FINAL: SEARCH BAR + STICKY HEADERS)

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

    // --- 🟢 EXCEL IMPORT ---
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
        if(window.confirm("Delete this folder and all contents?")) await deleteDocument(id);
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
        const cleanedFields = newFields.filter(f => f.trim() !== '');
        if (!newFolderName || cleanedFields.length === 0) return alert("Name & Fields required!");
        await addDocument({ name: newFolderName, type: 'sheet', parentId: parentId, fields: cleanedFields, createdAt: new Date() });
        setIsCreating(false); setNewFolderName(''); setNewFields(['Name', 'Contact Number', 'Address']);
    };
    const handleAddField = () => setNewFields([...newFields, '']);
    const handleFieldChange = (i, v) => { const u = [...newFields]; u[i] = v; setNewFields(u); };

    if (isImporting || isDownloading) return <LoadingSpinner message={isDownloading ? "Generating Excel File..." : "Processing Import..."} />;

    return (
        <div className="p-6">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                    {!isRoot && <button onClick={onBack} className="text-gray-500 hover:text-gray-800 text-xl font-bold">⬅</button>}
                    <div><h2 className="text-2xl font-bold text-gray-800">{isRoot ? "Office Data" : `📂 ${parentName}`}</h2>{!isRoot && <p className="text-sm text-gray-500">Select a sheet to view data</p>}</div>
                </div>
                <div className="flex gap-3">
                    {isRoot && <><input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} /><button onClick={() => fileInputRef.current.click()} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2">📊 Import Excel File</button></>}
                    <button onClick={() => setIsCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">+ New {isRoot ? 'File/Folder' : 'Sheet'}</button>
                </div>
            </div>
            {isCreating && (
                <div className="bg-white p-6 rounded shadow-md mb-8 border border-blue-200">
                    <h3 className="font-bold mb-4">Create New {isRoot ? 'Folder' : 'Sheet'}</h3>
                    <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full p-2 border rounded mb-4" placeholder="Name..." />
                    <div className="mb-4"><label className="block text-sm font-bold mb-2">Columns</label>{newFields.map((f, i) => (<div key={i} className="flex gap-2 mb-2"><input type="text" value={f} onChange={(e) => handleFieldChange(i, e.target.value)} className="flex-1 p-2 border rounded" /></div>))}<button onClick={handleAddField} className="text-sm text-blue-600 font-bold">+ Add Column</button></div>
                    <div className="flex gap-2"><button onClick={handleCreate} className="bg-green-600 text-white px-4 py-2 rounded">Create</button><button onClick={() => setIsCreating(false)} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button></div>
                </div>
            )}
            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items?.map(item => (
                        <div key={item.id} onClick={() => onSelect(item)} className={`p-6 rounded-xl shadow cursor-pointer hover:shadow-lg transition border group relative ${item.type === 'workbook' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
                            <div className="text-4xl mb-2">{item.type === 'workbook' ? '📁' : '📄'}</div>
                            <h3 className="font-bold text-lg text-gray-800 truncate" title={item.name}>{item.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">{item.type === 'workbook' ? 'Excel File / Group' : `${item.fields?.length || 0} Columns`}</p>
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                {item.type === 'workbook' && <button onClick={(e) => handleDownloadWorkbook(e, item)} title="Download" className="text-green-600 hover:text-green-800 bg-white rounded-full p-1 shadow-sm">📥</button>}
                                <button onClick={(e) => handleDelete(e, item.id)} className="text-red-400 hover:text-red-600 bg-white rounded-full p-1 shadow-sm">🗑️</button>
                            </div>
                        </div>
                    ))}
                    {items?.length === 0 && <p className="text-gray-500 col-span-full text-center py-10">{isRoot ? "No files yet. Import an Excel file!" : "No sheets in this folder."}</p>}
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 📄 COMPONENT: DATA TABLE (With Search & Sticky Headers)
// ----------------------------------------------------------------------
const FolderDataView = ({ folder, onBack }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);
    
    // 🔍 SEARCH STATE
    const [searchQuery, setSearchQuery] = useState('');

    const dataFilters = useMemo(() => [['folderId', '==', folder.id]], [folder.id]);
    const { data: rawFolderData, loading, addDocument, updateDocument, deleteDocument } = useFirestore('office_data', dataFilters);

    // 🔄 SORTING + SEARCHING LOGIC
    const folderData = useMemo(() => {
        if (!rawFolderData) return [];
        
        // 1. Sort by Sequence
        const sorted = [...rawFolderData].sort((a, b) => {
            if (a._sortIndex !== undefined && b._sortIndex !== undefined) return a._sortIndex - b._sortIndex;
            return (a.createdAt?.toDate ? a.createdAt.toDate() : 0) - (b.createdAt?.toDate ? b.createdAt.toDate() : 0);
        });

        // 2. Search Filter
        if (!searchQuery.trim()) return sorted;

        return sorted.filter(row => {
            // Check all columns for the search query
            return folder.fields.some(field => 
                String(row[field] || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
        });

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        if (!window.confirm(`Are you sure you want to delete the column "${columnName}"? Data in this column will be hidden.`)) return;
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
        <div className="p-6 h-full flex flex-col">
            {/* Header Area */}
            <div className="flex flex-col gap-4 border-b pb-4 mb-4">
                {/* Top Row: Navigation & Actions */}
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="text-gray-500 hover:text-gray-800 text-lg font-bold">⬅ Back</button>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">📄 {folder.name}</h2>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Data Sheet</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">📊 Export</button>
                        <button onClick={() => setIsAddingColumn(true)} className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700">+ Column</button>
                        <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({}); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">+ Row</button>
                    </div>
                </div>

                {/* 🔍 SEARCH BAR */}
                <div className="relative w-full md:w-1/2">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">🔍</span>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search any data (Name, Number, etc.)..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {isAddingColumn && (
                <div className="bg-purple-50 p-4 rounded border border-purple-200 mb-6 flex gap-3 items-center animate-fade-in-down">
                    <span className="font-bold text-purple-800">New Column Name:</span>
                    <input type="text" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} className="p-2 border rounded flex-1" placeholder="e.g. Email" />
                    <button onClick={handleAddColumn} className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700">Add</button>
                    <button onClick={() => setIsAddingColumn(false)} className="text-gray-500 hover:text-red-500 px-2">Cancel</button>
                </div>
            )}

            {isAdding && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-blue-200 mb-8">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-bold text-lg text-gray-800">{editingId ? '✏️ Edit Row' : '➕ Add New Row'}</h3>
                        <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-red-500">✕</button>
                    </div>
                    <form onSubmit={handleSave}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {folder.fields.map((field) => (
                                <div key={field}>
                                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">{field}</label>
                                    <input type="text" value={formData[field] || ''} onChange={(e) => handleInputChange(field, e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder={`Enter ${field}`} />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300 font-medium">Cancel</button>
                            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 font-bold">{editingId ? 'Update' : 'Save'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* 🔥 STICKY HEADER TABLE */}
            <div className="bg-white rounded shadow overflow-x-auto flex-1 border border-gray-200" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {loading ? <LoadingSpinner /> : (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-100 border-b shadow-sm sticky top-0 z-10">
                            <tr>
                                {folder.fields.map(f => (
                                    <th key={f} className="p-4 whitespace-nowrap font-semibold text-gray-700 text-sm border-r border-gray-200 group bg-gray-100">
                                        <div className="flex justify-between items-center gap-2">
                                            <span>{f}</span>
                                            <button onClick={() => handleDeleteColumn(f)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition font-bold" title="Delete Column">✕</button>
                                        </div>
                                    </th>
                                ))}
                                <th className="p-4 bg-gray-100 w-24 text-center font-bold text-gray-700 sticky right-0 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)] z-20">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {folderData.length > 0 ? (
                                folderData.map(row => (
                                    <tr key={row.id} className="border-b hover:bg-blue-50 transition group">
                                        {folder.fields.map(f => (
                                            <td key={f} className="p-3 text-sm text-gray-800 border-r border-gray-100 max-w-[200px] truncate" title={row[f]}>{row[f] || '-'}</td>
                                        ))}
                                        <td className="p-3 flex justify-center gap-3 sticky right-0 bg-white group-hover:bg-blue-50 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                                            <button onClick={() => handleEdit(row)} className="text-blue-500 hover:text-blue-700 font-medium" title="Edit">✏️</button>
                                            <button onClick={() => window.confirm("Delete this row?") && deleteDocument(row.id)} className="text-red-400 hover:text-red-600 font-medium" title="Delete">🗑️</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={folder.fields.length + 1} className="p-10 text-center text-gray-400 italic">No data found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
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
    return <div className="min-h-screen bg-gray-50"><FolderBrowser isRoot={true} parentId="ROOT" parentName="Office Data" onSelect={(item) => { if (item.type === 'workbook') setSelectedFile(item); else setSelectedSheet(item); }} onBack={null} /></div>;
}

export default OfficeData;