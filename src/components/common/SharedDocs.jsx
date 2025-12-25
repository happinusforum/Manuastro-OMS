// src/components/common/SharedDocs.jsx (FIXED: CONTROLLED INPUT ERROR)

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext'; 
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 

// ----------------------------------------------------------------------
// 👥 USER SELECTION MODAL
// ----------------------------------------------------------------------
const UserSelector = ({ selectedUsers, setSelectedUsers, currentUserRole }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [admins, setAdmins] = useState([]); 

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const q = query(collection(db, "users"));
                const querySnapshot = await getDocs(q);
                const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                userList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                
                const adminList = userList.filter(u => u.role === 'admin').map(u => u.id);
                setAdmins(adminList);

                if (currentUserRole !== 'admin') {
                    const mandatorySelection = [...new Set([...selectedUsers, ...adminList])];
                    if (JSON.stringify(mandatorySelection) !== JSON.stringify(selectedUsers)) {
                        setSelectedUsers(mandatorySelection);
                    }
                }
                setUsers(userList);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchUsers();
    }, []); 

    const toggleUser = (userId) => {
        if (currentUserRole !== 'admin' && admins.includes(userId)) {
            alert("Admin access is mandatory.");
            return;
        }
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    if (loading) return <p className="text-xs text-gray-500 animate-pulse">Loading users...</p>;

    return (
        <div className="mb-4 border border-gray-200 p-3 rounded-lg bg-gray-50 max-h-60 overflow-y-auto custom-scrollbar shadow-inner">
            <label className="block text-sm font-bold mb-3 text-gray-700 flex justify-between items-center sticky top-0 bg-gray-50 pb-2 border-b">
                <span>Select People to Share With:</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{selectedUsers.length} selected</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {users.map(user => {
                    const isAdminUser = user.role === 'admin';
                    const isLocked = currentUserRole !== 'admin' && isAdminUser;

                    return (
                        <div 
                            key={user.id} 
                            onClick={() => !isLocked && toggleUser(user.id)} 
                            className={`cursor-pointer p-2.5 text-xs rounded-lg border flex items-center gap-3 transition-all duration-200 
                                ${selectedUsers.includes(user.id) ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300'}
                                ${isLocked ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}
                            `}
                        >
                            <input type="checkbox" checked={selectedUsers.includes(user.id)} readOnly className="accent-blue-600 w-4 h-4 cursor-pointer rounded" disabled={isLocked} />
                            <div className="flex flex-col truncate w-full">
                                <span className="font-semibold text-gray-800 truncate flex items-center gap-1">
                                    {user.name || user.email}
                                    {isLocked && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded border border-red-200">LOCKED</span>}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-500">{user.empId}</span>
                                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md ${user.role === 'admin' ? 'bg-red-100 text-red-700' : user.role === 'hr' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 📂 COMPONENT: FOLDER BROWSER
// ----------------------------------------------------------------------
const FolderBrowser = ({ parentId, parentName, onSelect, onBack, isRoot }) => {
    const { userProfile, currentUser } = useAuth();
    const isAdmin = userProfile?.role === 'admin';
    const currentRole = userProfile?.role; 

    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFields, setNewFields] = useState(['Name', 'Contact Number', 'Address']); 
    const [sharedWith, setSharedWith] = useState([]); 
    
    const [manageAccessItem, setManageAccessItem] = useState(null);
    const [tempSharedWith, setTempSharedWith] = useState([]);
    const [importFile, setImportFile] = useState(null); 
    const [showImportModal, setShowImportModal] = useState(false); 
    const [isProcessingImport, setIsProcessingImport] = useState(false); 
    const [userMap, setUserMap] = useState({});

    useEffect(() => {
        const fetchUserMap = async () => {
            try {
                const q = query(collection(db, "users"));
                const snap = await getDocs(q);
                const map = {};
                snap.docs.forEach(doc => { const d = doc.data(); map[doc.id] = d.name || d.email; });
                setUserMap(map);
            } catch (err) { console.error("Failed to load user map", err); }
        };
        fetchUserMap();
    }, []);

    const folderFilters = useMemo(() => {
        if (!isRoot) return [['parentId', '==', parentId]];
        if (isAdmin) return [['parentId', '==', 'ROOT']];
        return [['parentId', '==', 'ROOT'], ['sharedWith', 'array-contains', currentUser.uid]];
    }, [parentId, isRoot, isAdmin, currentUser.uid]);

    const { data: items, loading, addDocument, deleteDocument } = useFirestore('shared_folders', folderFilters);
    const fileInputRef = useRef(null);
    const { addDocument: addDataEntry } = useFirestore('shared_data');

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file);
        setSharedWith([currentUser.uid]); 
        setShowImportModal(true);
        e.target.value = "";
    };

    const handleExecuteImport = async () => {
        if (!importFile) return;
        setIsProcessingImport(true);
        const fileName = importFile.name.replace(/\.[^/.]+$/, ""); 
        const finalSharedWith = [...new Set([...sharedWith, currentUser.uid])];
        const reader = new FileReader();
        reader.readAsArrayBuffer(importFile);
        
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const parentFolderId = await addDocument({ name: fileName, type: 'workbook', parentId: 'ROOT', sharedWith: finalSharedWith, createdBy: currentUser.uid, createdAt: new Date() });

                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonDataWithHeader = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    if (!jsonDataWithHeader || !jsonDataWithHeader.length) continue;
                    const headers = jsonDataWithHeader[0];
                    const rowData = XLSX.utils.sheet_to_json(sheet);
                    if (headers && headers.length > 0) {
                        const sheetId = await addDocument({ name: sheetName, type: 'sheet', parentId: parentFolderId, fields: headers, createdAt: new Date() });
                        const uploadPromises = rowData.map((row, index) => addDataEntry({ ...row, folderId: sheetId, createdAt: new Date(), _sortIndex: index }));
                        await Promise.all(uploadPromises);
                    }
                }
                alert("Success! Imported & Shared.");
                closeImportModal();
            } catch (error) { console.error(error); alert("Import Failed: " + error.message); setIsProcessingImport(false); }
        };
    };

    const closeImportModal = () => { setShowImportModal(false); setImportFile(null); setSharedWith([]); setIsProcessingImport(false); };

    const openManageAccess = (e, item) => { 
        if (isAdmin || item.createdBy === currentUser.uid) {
            e.stopPropagation(); setManageAccessItem(item); setTempSharedWith(item.sharedWith || []); 
        } else { alert("Only the owner or Admin can manage access."); }
    };

    const handleSaveAccess = async () => {
        if (!manageAccessItem) return;
        try { await updateDoc(doc(db, 'shared_folders', manageAccessItem.id), { sharedWith: tempSharedWith }); alert("Updated!"); setManageAccessItem(null); } 
        catch (error) { alert("Failed."); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return alert("Name required!");
        const finalSharedWith = [...new Set([...sharedWith, currentUser.uid])];

        if (isRoot) {
            await addDocument({ name: newFolderName, type: 'workbook', parentId: 'ROOT', sharedWith: finalSharedWith, createdBy: currentUser.uid, createdAt: new Date() });
        } else {
            const cleaned = newFields.filter(f => f.trim() !== '');
            if (!cleaned.length) return alert("Columns required!");
            await addDocument({ name: newFolderName, type: 'sheet', parentId: parentId, fields: cleaned, createdAt: new Date() });
        }
        setIsCreating(false); setNewFolderName(''); setNewFields(['Name', 'Contact Number', 'Address']); setSharedWith([]);
    };

    const handleDelete = async (e, id, createdBy) => { 
        e.stopPropagation(); 
        if (isAdmin || createdBy === currentUser.uid) { if(window.confirm("Delete?")) await deleteDocument(id); } else { alert("Permission Denied."); }
    };

    const handleAddField = () => setNewFields([...newFields, '']);
    const handleFieldChange = (i, v) => { const u = [...newFields]; u[i] = v; setNewFields(u); };

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

    if (isProcessingImport) return <LoadingSpinner message="Importing..." />;

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen relative">
            
            {showImportModal && importFile && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up border border-gray-100">
                        <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">📊 Import & Share</h3>
                        <div className="mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-2">
                            <span className="text-2xl">📄</span>
                            <div>
                                <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Selected File</p>
                                <p className="text-sm font-semibold text-gray-800">{importFile.name}</p>
                            </div>
                        </div>
                        <UserSelector selectedUsers={sharedWith} setSelectedUsers={setSharedWith} currentUserRole={currentRole} />
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button onClick={closeImportModal} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm">Cancel</button>
                            <button onClick={handleExecuteImport} className="px-5 py-2.5 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition font-bold text-sm flex items-center gap-2"><span>🚀</span> Upload & Share</button>
                        </div>
                    </div>
                </div>
            )}

            {manageAccessItem && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up border border-gray-100">
                        <h3 className="text-xl font-bold mb-1 text-gray-800">Manage Access</h3>
                        <p className="text-sm text-gray-500 mb-5">Who can view & edit <span className="font-bold text-gray-800">"{manageAccessItem.name}"</span>?</p>
                        <UserSelector selectedUsers={tempSharedWith} setSelectedUsers={setTempSharedWith} currentUserRole={currentRole} />
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button onClick={() => setManageAccessItem(null)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm">Cancel</button>
                            <button onClick={handleSaveAccess} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition font-bold text-sm">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-200 pb-6">
                <div className="flex items-center gap-3">
                    {!isRoot && <button onClick={onBack} className="bg-white p-2 rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition text-gray-600">⬅</button>}
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">{isRoot ? "Shared Documents" : `📂 ${parentName}`}</h2>
                        <p className="text-sm text-gray-500 mt-1">{isRoot ? "Collaborate securely with your team" : "Manage sheets and data inside"}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {isRoot && <>
                        <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
                        <button onClick={() => fileInputRef.current.click()} className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-emerald-700 transition flex items-center gap-2 text-sm font-bold flex-1 md:flex-none justify-center"><span>📊</span> Import</button>
                    </>}
                    <button onClick={() => setIsCreating(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-blue-700 transition flex items-center gap-2 text-sm font-bold flex-1 md:flex-none justify-center"><span>+</span> Create New</button>
                </div>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-8 animate-fade-in-down relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <h3 className="font-bold text-lg mb-4 text-gray-800">Create New {isRoot ? 'Folder' : 'Sheet'}</h3>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                        <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Enter name..." />
                    </div>
                    {isRoot && <UserSelector selectedUsers={sharedWith} setSelectedUsers={setSharedWith} currentUserRole={currentRole} />}
                    {!isRoot && (
                        <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Define Columns</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                {newFields.map((f, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input value={f} onChange={(e) => handleFieldChange(i, e.target.value)} className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 outline-none" placeholder={`Column ${i+1}`} />
                                        <button onClick={() => {const u=[...newFields]; u.splice(i,1); setNewFields(u)}} className="text-gray-400 hover:text-red-500 px-2 transition">✕</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAddField} className="mt-3 text-xs text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1">+ Add Another Column</button>
                        </div>
                    )}
                    <div className="flex gap-3 justify-end pt-2">
                        <button onClick={() => setIsCreating(false)} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium">Cancel</button>
                        <button onClick={handleCreate} className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition text-sm font-bold">Create</button>
                    </div>
                </div>
            )}

            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {items?.map(item => (
                        <div key={item.id} onClick={() => onSelect(item)} className={`p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border cursor-pointer group relative flex flex-col h-40 justify-between ${item.type === 'workbook' ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-100 hover:border-indigo-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                            <div>
                                <div className="flex justify-between items-start">
                                    <span className="text-3xl filter drop-shadow-sm">{item.type === 'workbook' ? '📁' : '📄'}</span>
                                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                                        {item.type === 'workbook' && (isAdmin || item.createdBy === currentUser.uid) && <button onClick={(e) => openManageAccess(e, item)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition" title="Manage Access">👥</button>}
                                        {item.type === 'workbook' && <button onClick={(e) => handleDownloadWorkbook(e, item)} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition" title="Download">📥</button>}
                                        {(isAdmin || item.createdBy === currentUser.uid) && <button onClick={(e) => handleDelete(e, item.id, item.createdBy)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition" title="Delete">🗑️</button>}
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-800 truncate mt-3 text-lg leading-tight" title={item.name}>{item.name}</h3>
                            </div>
                            <div className="pt-3 border-t border-gray-100/50 flex justify-between items-end">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500">{item.type === 'workbook' ? 'Shared Folder' : 'Data Sheet'}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">By: {item.createdBy === currentUser.uid ? 'You' : (userMap[item.createdBy] || 'Unknown')}</p>
                                </div>
                                {item.type === 'workbook' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{item.sharedWith?.length || 0} Users</span>}
                            </div>
                        </div>
                    ))}
                    {items?.length === 0 && <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50"><span className="text-4xl mb-3 opacity-50">📭</span><p className="font-medium">No items found.</p></div>}
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
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 min-h-screen">
            <div className="flex flex-col gap-4 border-b pb-4 mb-4 bg-white p-4 rounded-xl shadow-sm">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition">⬅</button>
                        <div><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">📄 {folder.name}</h2><span className="text-[10px] uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">Shared Sheet</span></div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-green-700 text-sm whitespace-nowrap">📊 Export</button>
                        <button onClick={() => setIsAddingColumn(true)} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-purple-700 text-sm whitespace-nowrap">+ Column</button>
                        <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({}); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-blue-700 text-sm whitespace-nowrap">+ Row</button>
                    </div>
                </div>
                <div className="relative w-full"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition text-sm" /></div>
            </div>

            {isAddingColumn && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm animate-fade-in-down"><h3 className="font-bold text-lg mb-4 text-purple-800">Add New Column</h3><input type="text" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} className="w-full p-2 border rounded-lg mb-4" placeholder="Column Name" /><div className="flex justify-end gap-3"><button onClick={() => setIsAddingColumn(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Cancel</button><button onClick={handleAddColumn} className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow text-sm">Add</button></div></div></div>}

            {isAdding && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-down"><div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-lg text-gray-800">{editingId ? '✏️ Edit Entry' : '➕ Add Entry'}</h3><button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-red-500 text-xl">✕</button></div><form onSubmit={handleSave}><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">{folder.fields.map((field) => (<div key={field}><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">{field}</label><input type="text" value={formData[field] || ''} onChange={(e) => handleInputChange(field, e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder={`Enter ${field}`} /></div>))}</div><div className="flex gap-3 justify-end sticky bottom-0 bg-white pt-2 border-t"><button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium text-sm hover:bg-gray-300">Cancel</button><button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 font-bold text-sm">{editingId ? 'Update' : 'Save'}</button></div></form></div></div>}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    {loading ? <LoadingSpinner /> : (
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm"><tr>{folder.fields.map(f => <th key={f} className="p-3 whitespace-nowrap font-semibold text-gray-600 text-sm border-r border-gray-100 bg-gray-50 group"><div className="flex justify-between items-center gap-2"><span>{f}</span><button onClick={() => handleDeleteColumn(f)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition" title="Delete Column">✕</button></div></th>)}<th className="p-3 bg-gray-50 w-24 text-center font-bold text-gray-600 sticky right-0 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] z-20">Action</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">{folderData.length > 0 ? folderData.map(row => (<tr key={row.id} className="hover:bg-blue-50/50 transition duration-150 group">{folder.fields.map(f => <td key={f} className="p-3 text-sm text-gray-700 border-r border-gray-50 max-w-[200px] truncate" title={row[f]}>{row[f]||'-'}</td>)}<td className="p-3 flex justify-center gap-3 sticky right-0 bg-white group-hover:bg-blue-50/50 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)]"><button onClick={() => handleEdit(row)} className="text-blue-500 hover:text-blue-700 font-medium p-1 rounded hover:bg-blue-100" title="Edit">✏️</button><button onClick={() => window.confirm("Delete this row?") && deleteDocument(row.id)} className="text-red-400 hover:text-red-600 font-medium p-1 rounded hover:bg-red-100" title="Delete">🗑️</button></td></tr>)) : <tr><td colSpan={folder.fields.length+1} className="p-10 text-center text-gray-400 italic bg-gray-50/30">No data found.</td></tr>}</tbody>
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
function SharedDocs() {
    const [selectedFile, setSelectedFile] = useState(null); 
    const [selectedSheet, setSelectedSheet] = useState(null); 

    if (selectedSheet) return <FolderDataView folder={selectedSheet} onBack={() => setSelectedSheet(null)} />;
    if (selectedFile) return <FolderBrowser isRoot={false} parentId={selectedFile.id} parentName={selectedFile.name} onSelect={(item) => setSelectedSheet(item)} onBack={() => setSelectedFile(null)} />;
    return <div className="min-h-screen bg-gray-100"><FolderBrowser isRoot={true} parentId="ROOT" parentName="Shared Docs" onSelect={(item) => { if (item.type === 'workbook') setSelectedFile(item); else setSelectedSheet(item); }} onBack={null} /></div>;
}

export default SharedDocs;