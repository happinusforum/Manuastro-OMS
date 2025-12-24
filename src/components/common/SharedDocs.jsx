// src/components/common/SharedDocs.jsx (FINAL: SORTED EMPLOYEE LIST)

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext'; 
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 

// ----------------------------------------------------------------------
// 👥 HELPER: USER SELECTION MODAL (SORTED BY EMP ID)
// ----------------------------------------------------------------------
const UserSelector = ({ selectedUsers, setSelectedUsers }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const q = query(collection(db, "users"), where("role", "in", ["employee", "hr"]));
                const querySnapshot = await getDocs(q);
                const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // 🔥 SORTING LOGIC: Sort by Employee ID Number (e.g. 001, 002)
                userList.sort((a, b) => {
                    const getNum = (id) => {
                        if (!id) return 9999;
                        const match = id.match(/\d+$/);
                        return match ? parseInt(match[0], 10) : 9999;
                    };
                    return getNum(a.empId) - getNum(b.empId);
                });

                setUsers(userList);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchUsers();
    }, []);

    const toggleUser = (userId) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    if (loading) return <p className="text-xs text-gray-500 animate-pulse">Loading staff list...</p>;

    return (
        <div className="mb-4 border p-3 rounded bg-gray-50 max-h-60 overflow-y-auto custom-scrollbar">
            <label className="block text-sm font-bold mb-2 text-gray-700 flex justify-between">
                <span>Select Users to Share:</span>
                <span className="text-xs font-normal text-gray-500">({selectedUsers.length} selected)</span>
            </label>
            {users.length === 0 ? <p className="text-xs text-gray-500 italic">No HR or Employees found.</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {users.map(user => (
                        <div key={user.id} onClick={() => toggleUser(user.id)} className={`cursor-pointer p-2 text-xs rounded border flex items-center gap-2 transition duration-150 ease-in-out ${selectedUsers.includes(user.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                            <input type="checkbox" checked={selectedUsers.includes(user.id)} readOnly className="accent-blue-600 w-3 h-3 cursor-pointer" />
                            <div className="flex flex-col truncate w-full">
                                <span className="font-medium text-gray-800 truncate">{user.name || user.email} ({user.empId})</span>
                                <span className={`text-[10px] uppercase font-bold w-max px-1.5 py-0.5 rounded-sm mt-0.5 ${user.role === 'hr' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>{user.role}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 📂 COMPONENT: FOLDER BROWSER
// ----------------------------------------------------------------------
const FolderBrowser = ({ parentId, parentName, onSelect, onBack, isRoot }) => {
    const { userProfile, currentUser } = useAuth();
    const isAdmin = userProfile?.role === 'admin';

    // State for Manual Create
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFields, setNewFields] = useState(['Name', 'Contact Number', 'Address']); 
    
    // State for Sharing
    const [sharedWith, setSharedWith] = useState([]); 
    
    // State for Manage Access Modal
    const [manageAccessItem, setManageAccessItem] = useState(null);
    const [tempSharedWith, setTempSharedWith] = useState([]);

    // 🔥 STATE FOR IMPORT MODAL
    const [importFile, setImportFile] = useState(null); // File store karega
    const [showImportModal, setShowImportModal] = useState(false); // Modal toggle
    const [isProcessingImport, setIsProcessingImport] = useState(false); // Loading state

    const folderFilters = useMemo(() => {
        if (!isRoot) return [['parentId', '==', parentId]];
        if (isAdmin) return [['parentId', '==', 'ROOT']];
        return [['parentId', '==', 'ROOT'], ['sharedWith', 'array-contains', currentUser.uid]];
    }, [parentId, isRoot, isAdmin, currentUser.uid]);

    const { data: items, loading, addDocument, deleteDocument } = useFirestore('shared_folders', folderFilters);
    const fileInputRef = useRef(null);
    const { addDocument: addDataEntry } = useFirestore('shared_data');

    // --- 🟢 STEP 1: FILE SELECT ---
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file); // File save karo state me
        setSharedWith([]); // Users reset karo
        setShowImportModal(true); // Modal kholo
        e.target.value = ""; // Input reset
    };

    // --- 🟢 STEP 2: EXECUTE IMPORT (After selecting users) ---
    const handleExecuteImport = async () => {
        if (!importFile) return;
        setIsProcessingImport(true);

        const fileName = importFile.name.replace(/\.[^/.]+$/, ""); 
        const usersToShare = isAdmin ? sharedWith : [currentUser.uid];

        const reader = new FileReader();
        reader.readAsArrayBuffer(importFile);
        
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // 1. Create Parent Workbook with Selected Users
                const parentFolderId = await addDocument({ 
                    name: fileName, 
                    type: 'workbook', 
                    parentId: 'ROOT', 
                    sharedWith: usersToShare, // 🔥 Access saved here
                    createdBy: currentUser.uid, 
                    createdAt: new Date() 
                });

                // 2. Loop Sheets
                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonDataWithHeader = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    if (!jsonDataWithHeader || jsonDataWithHeader.length === 0) continue;
                    
                    const headers = jsonDataWithHeader[0];
                    const rowData = XLSX.utils.sheet_to_json(sheet);

                    if (headers && headers.length > 0) {
                        const sheetId = await addDocument({ 
                            name: sheetName, 
                            type: 'sheet', 
                            parentId: parentFolderId, 
                            fields: headers, 
                            createdAt: new Date() 
                        });

                        const uploadPromises = rowData.map((row, index) => addDataEntry({ 
                            ...row, 
                            folderId: sheetId, 
                            createdAt: new Date(), 
                            _sortIndex: index 
                        }));
                        await Promise.all(uploadPromises);
                    }
                }
                alert("Success! File Imported & Shared.");
                closeImportModal();
            } catch (error) { 
                console.error(error); 
                alert("Import Failed: " + error.message); 
                setIsProcessingImport(false);
            }
        };
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setSharedWith([]);
        setIsProcessingImport(false);
    };

    // --- MANAGE ACCESS ---
    const openManageAccess = (e, item) => { e.stopPropagation(); setManageAccessItem(item); setTempSharedWith(item.sharedWith || []); };
    const handleSaveAccess = async () => {
        if (!manageAccessItem) return;
        try { await updateDoc(doc(db, 'shared_folders', manageAccessItem.id), { sharedWith: tempSharedWith }); alert("Updated!"); setManageAccessItem(null); } 
        catch (error) { alert("Failed."); }
    };

    // --- DOWNLOAD ---
    const handleDownloadWorkbook = async (e, workbookItem) => {
        e.stopPropagation();
        try {
            const wb = XLSX.utils.book_new();
            const sheetsQuery = query(collection(db, 'shared_folders'), where('parentId', '==', workbookItem.id));
            const snap = await getDocs(sheetsQuery);
            if (snap.empty) return alert("No sheets.");
            for (const d of snap.docs) {
                const info = d.data();
                const dQuery = query(collection(db, 'shared_data'), where('folderId', '==', d.id));
                const dSnap = await getDocs(dQuery);
                const raw = dSnap.docs.map(doc => doc.data()).sort((a,b)=> (a._sortIndex||0)-(b._sortIndex||0));
                const clean = raw.map(r => { const obj={}; (info.fields||[]).forEach(f=>obj[f]=r[f]||''); return obj; });
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clean), info.name||'Sheet');
            }
            XLSX.writeFile(wb, `${workbookItem.name}.xlsx`);
        } catch (e) { alert("Download Error"); }
    };

    // --- MANUAL CREATE ---
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return alert("Name required!");
        const usersToShare = isAdmin ? sharedWith : [currentUser.uid];
        if (isRoot) await addDocument({ name: newFolderName, type: 'workbook', parentId: 'ROOT', sharedWith: usersToShare, createdBy: currentUser.uid, createdAt: new Date() });
        else {
            const cleaned = newFields.filter(f => f.trim() !== '');
            if (!cleaned.length) return alert("Columns required!");
            await addDocument({ name: newFolderName, type: 'sheet', parentId: parentId, fields: cleaned, createdAt: new Date() });
        }
        setIsCreating(false); setNewFolderName(''); setNewFields(['Name', 'Contact Number', 'Address']); setSharedWith([]);
    };

    const handleDelete = async (e, id) => { e.stopPropagation(); if(window.confirm("Delete?")) await deleteDocument(id); };
    const handleAddField = () => setNewFields([...newFields, '']);
    const handleFieldChange = (i, v) => { const u = [...newFields]; u[i] = v; setNewFields(u); };

    if (isProcessingImport) return <LoadingSpinner message="Importing and Sharing..." />;

    return (
        <div className="p-6 relative">
            
            {/* 🟢 IMPORT CONFIRMATION MODAL */}
            {showImportModal && importFile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md animate-fade-in-down">
                        <h3 className="text-xl font-bold mb-2 text-gray-800">Import & Share</h3>
                        <div className="mb-4 text-sm text-gray-600 bg-gray-100 p-2 rounded">
                            File Selected: <span className="font-bold text-blue-600">{importFile.name}</span>
                        </div>
                        
                        {isAdmin && <UserSelector selectedUsers={sharedWith} setSelectedUsers={setSharedWith} />}
                        
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={closeImportModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Cancel</button>
                            <button onClick={handleExecuteImport} className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 font-bold">
                                Upload & Share
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MANAGE ACCESS MODAL */}
            {manageAccessItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md animate-fade-in-down">
                        <h3 className="text-xl font-bold mb-2 text-gray-800">Manage Access</h3>
                        <p className="text-sm text-gray-600 mb-4">Editing for: <span className="font-bold">{manageAccessItem.name}</span></p>
                        <UserSelector selectedUsers={tempSharedWith} setSelectedUsers={setTempSharedWith} />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setManageAccessItem(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded">Cancel</button>
                            <button onClick={handleSaveAccess} className="px-4 py-2 bg-blue-600 text-white rounded shadow">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                    {!isRoot && <button onClick={onBack} className="text-gray-500 hover:text-gray-800 text-xl font-bold">⬅</button>}
                    <div><h2 className="text-2xl font-bold text-gray-800">{isRoot ? "Shared Documents" : `📂 ${parentName}`}</h2><p className="text-sm text-gray-500">{isAdmin ? "Manage & Share" : "Files shared with you"}</p></div>
                </div>
                {isAdmin && (
                    <div className="flex gap-3">
                        {isRoot && <>
                            {/* Hidden File Input */}
                            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
                            <button onClick={() => fileInputRef.current.click()} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2">📊 Import & Share</button>
                        </>}
                        <button onClick={() => setIsCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">+ Create New</button>
                    </div>
                )}
            </div>

            {/* CREATE FORM */}
            {isCreating && (
                <div className="bg-white p-6 rounded shadow-md mb-8 border border-blue-200">
                    <h3 className="font-bold mb-4">Create New {isRoot ? 'Folder' : 'Sheet'}</h3>
                    <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full p-2 border rounded mb-4" placeholder="Name..." />
                    
                    {/* Share selection ONLY for Manual Root Folder */}
                    {isRoot && isAdmin && <UserSelector selectedUsers={sharedWith} setSelectedUsers={setSharedWith} />}

                    {!isRoot && (
                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Columns</label>
                            {newFields.map((f, i) => (<div key={i} className="flex gap-2 mb-2"><input value={f} onChange={(e) => handleFieldChange(i, e.target.value)} className="flex-1 p-2 border rounded" /><button onClick={() => {const u=[...newFields]; u.splice(i,1); setNewFields(u)}} className="text-red-500">x</button></div>))}
                            <button onClick={handleAddField} className="text-sm text-blue-600">+ Add Column</button>
                        </div>
                    )}
                    <div className="flex gap-2"><button onClick={handleCreate} className="bg-green-600 text-white px-4 py-2 rounded">Create & Share</button><button onClick={() => setIsCreating(false)} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button></div>
                </div>
            )}

            {/* GRID DISPLAY */}
            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items?.map(item => (
                        <div key={item.id} onClick={() => onSelect(item)} className={`p-6 rounded-xl shadow cursor-pointer hover:shadow-lg transition border group relative ${item.type === 'workbook' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}>
                            <div className="text-4xl mb-2">{item.type === 'workbook' ? '🗂️' : '📄'}</div>
                            <h3 className="font-bold text-lg text-gray-800 truncate" title={item.name}>{item.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">{item.type === 'workbook' ? (isAdmin ? `Shared with: ${item.sharedWith?.length || 0} Users` : 'Shared File') : `${item.fields?.length || 0} Columns`}</p>
                            {isAdmin && (
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    {item.type === 'workbook' && <button onClick={(e) => openManageAccess(e, item)} className="text-blue-600 bg-white rounded-full p-1 shadow-sm hover:bg-blue-50">👥</button>}
                                    {item.type === 'workbook' && <button onClick={(e) => handleDownloadWorkbook(e, item)} className="text-green-600 bg-white rounded-full p-1 shadow-sm hover:bg-green-50">📥</button>}
                                    <button onClick={(e) => handleDelete(e, item.id)} className="text-red-400 bg-white rounded-full p-1 shadow-sm hover:bg-red-50">🗑️</button>
                                </div>
                            )}
                        </div>
                    ))}
                    {items?.length === 0 && <p className="text-gray-500 col-span-full text-center py-10">No items found.</p>}
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 📄 COMPONENT: DATA VIEW (Same as OfficeData)
// ----------------------------------------------------------------------
const FolderDataView = ({ folder, onBack }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const dataFilters = useMemo(() => [['folderId', '==', folder.id]], [folder.id]);
    const { data: rawFolderData, loading, addDocument, updateDocument, deleteDocument } = useFirestore('shared_data', dataFilters);

    const folderData = useMemo(() => {
        if (!rawFolderData) return [];
        const sorted = [...rawFolderData].sort((a, b) => (a._sortIndex || 0) - (b._sortIndex || 0));
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
    const handleEdit = (record) => { setFormData(record); setEditingId(record.id); setIsAdding(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    
    const handleAddColumn = async () => {
        if (!newColumnName.trim()) return alert("Name required");
        if (folder.fields.includes(newColumnName)) return alert("Exists!");
        try { await updateDoc(doc(db, 'shared_folders', folder.id), { fields: [...folder.fields, newColumnName] }); setIsAddingColumn(false); setNewColumnName(''); onBack(); } catch (err) { alert("Failed"); }
    };
    const handleDeleteColumn = async (col) => {
        if (!window.confirm("Delete col?")) return;
        try { await updateDoc(doc(db, 'shared_folders', folder.id), { fields: folder.fields.filter(f => f !== col) }); onBack(); } catch (err) { alert("Failed"); }
    };
    const handleDownloadExcel = () => {
        if (!folderData.length) return alert("No data");
        const exportData = folderData.map(row => { const r = {}; folder.fields.forEach(f => r[f] = row[f] || ''); return r; });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${folder.name}.xlsx`);
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col gap-4 border-b pb-4 mb-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="text-gray-500 hover:text-gray-800 text-lg font-bold">⬅ Back</button>
                        <div><h2 className="text-2xl font-bold text-gray-800">📄 {folder.name}</h2><span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Shared Sheet</span></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">📊 Export</button>
                        <button onClick={() => setIsAddingColumn(true)} className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700">+ Column</button>
                        <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({}); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">+ Row</button>
                    </div>
                </div>
                <div className="relative w-full md:w-1/2"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">🔍</span><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none" /></div>
            </div>

            {isAddingColumn && <div className="bg-purple-50 p-4 rounded border mb-6 flex gap-3"><input value={newColumnName} onChange={e => setNewColumnName(e.target.value)} className="p-2 border rounded flex-1" placeholder="Col Name" /><button onClick={handleAddColumn} className="bg-purple-600 text-white px-4 rounded">Add</button><button onClick={() => setIsAddingColumn(false)}>Cancel</button></div>}

            {isAdding && (
                <div className="bg-white p-6 rounded shadow-md border border-blue-200 mb-8">
                    <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-lg text-gray-800">{editingId ? '✏️ Edit Row' : '➕ Add New Row'}</h3><button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-red-500">✕</button></div>
                    <form onSubmit={handleSave}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">{folder.fields.map(f => (<div key={f}><label className="text-xs font-bold text-gray-600 mb-1 uppercase">{f}</label><input value={formData[f]||''} onChange={e=>handleInputChange(f, e.target.value)} className="w-full p-2 border rounded" /></div>))}</div>
                        <div className="flex gap-3 justify-end"><button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 px-6 py-2 rounded">Cancel</button><button className="bg-blue-600 text-white px-6 py-2 rounded">{editingId ? 'Update' : 'Save'}</button></div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded shadow overflow-x-auto flex-1 border border-gray-200" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                {loading ? <LoadingSpinner /> : (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-100 border-b shadow-sm sticky top-0 z-10"><tr>{folder.fields.map(f => <th key={f} className="p-4 whitespace-nowrap font-semibold border-r group bg-gray-100"><div className="flex justify-between"><span>{f}</span><button onClick={() => handleDeleteColumn(f)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100">✕</button></div></th>)}<th className="p-4 bg-gray-100 sticky right-0 text-center z-20 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">Action</th></tr></thead>
                        <tbody>{folderData.length > 0 ? folderData.map(row => (<tr key={row.id} className="border-b hover:bg-blue-50">{folder.fields.map(f => <td key={f} className="p-3 text-sm border-r truncate max-w-[200px]" title={row[f]}>{row[f]||'-'}</td>)}<td className="p-3 flex justify-center gap-3 sticky right-0 bg-white group-hover:bg-blue-50 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]"><button onClick={() => handleEdit(row)} className="text-blue-500">✏️</button><button onClick={() => window.confirm("Delete?") && deleteDocument(row.id)} className="text-red-400">🗑️</button></td></tr>)) : <tr><td colSpan={folder.fields.length+1} className="p-10 text-center">No data</td></tr>}</tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 🚀 MAIN CONTROLLER
// ----------------------------------------------------------------------
function SharedDocs() {
    const [selectedFile, setSelectedFile] = useState(null); 
    const [selectedSheet, setSelectedSheet] = useState(null); 

    if (selectedSheet) return <FolderDataView folder={selectedSheet} onBack={() => setSelectedSheet(null)} />;
    if (selectedFile) return <FolderBrowser isRoot={false} parentId={selectedFile.id} parentName={selectedFile.name} onSelect={(item) => setSelectedSheet(item)} onBack={() => setSelectedFile(null)} />;
    return <div className="min-h-screen bg-gray-50"><FolderBrowser isRoot={true} parentId="ROOT" parentName="Shared Docs" onSelect={(item) => { if (item.type === 'workbook') setSelectedFile(item); else setSelectedSheet(item); }} onBack={null} /></div>;
}

export default SharedDocs;