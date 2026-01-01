// src/components/common/SharedDocs.jsx (FINAL FIXED: Sorting & Zero Handling)

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext'; 
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch, addDoc } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 
import ExcelEditor from './ExcelEditor'; 

// ----------------------------------------------------------------------
// 🛠️ HELPER: DATE SORTER & TIMESTAMP EXTRACTOR
// ----------------------------------------------------------------------
const getTimestamp = (t) => {
    if (!t) return 0;
    if (typeof t.toDate === 'function') return t.toDate().getTime(); // Firestore Timestamp
    if (t instanceof Date) return t.getTime(); // JS Date
    return new Date(t).getTime() || 0; // String/Other
};

// ----------------------------------------------------------------------
// 👥 USER SELECTION MODAL
// ----------------------------------------------------------------------
const UserSelector = ({ selectedUsers, setSelectedUsers, currentUserRole }) => {
    // ... [Same UserSelector Logic as before] ...
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
                        <div key={user.id} onClick={() => !isLocked && toggleUser(user.id)} className={`cursor-pointer p-2.5 text-xs rounded-lg border flex items-center gap-3 transition-all duration-200 ${selectedUsers.includes(user.id) ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300'} ${isLocked ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
                            <input type="checkbox" checked={selectedUsers.includes(user.id)} readOnly className="accent-blue-600 w-4 h-4 cursor-pointer rounded" disabled={isLocked} />
                            <div className="flex flex-col truncate w-full">
                                <span className="font-semibold text-gray-800 truncate flex items-center gap-1">{user.name || user.email}{isLocked && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded border border-red-200">LOCKED</span>}</span>
                                <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-gray-500">{user.empId}</span><span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md ${user.role === 'admin' ? 'bg-red-100 text-red-700' : user.role === 'hr' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{user.role}</span></div>
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

    // 🛠️ FIX: Sort Folders (Newest at Bottom/Top as preferred, here Newest Last like Folders usually are sorted by name or date)
    // For Folders, usually sorting by Name is better, or Date. Let's stick to Date for consistency.
    const { data: rawItems, loading, addDocument, deleteDocument } = useFirestore('shared_folders', folderFilters);
    const items = useMemo(() => {
        if(!rawItems) return [];
        return [...rawItems].sort((a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt));
    }, [rawItems]);

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
                // 🛠️ FIX: Handle 0 in Workbook Download
                const clean = raw.map(r => { 
                    const obj={}; 
                    (info.fields||[]).forEach(f=> {
                        const val = r[f];
                        obj[f] = (val !== undefined && val !== null) ? val : '';
                    }); 
                    return obj; 
                });
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clean), info.name||'Sheet');
            }
            XLSX.writeFile(wb, `${workbookItem.name}.xlsx`);
        } catch (e) { alert("Download Error"); }
    };

    if (isProcessingImport) return <LoadingSpinner message="Importing..." />;

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen relative">
            {/* ... [Import Modal & Manage Access Modal Logic - Unchanged] ... */}
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
// 📄 COMPONENT: DATA TABLE VIEW (WITH EXCEL EDITOR LOGIC)
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
    const { data: rawFolderData, loading, addDocument, updateDocument, deleteDocument } = useFirestore('shared_data', dataFilters);

    // 🟢 1. Prepare Data for ExcelEditor (LOAD)
    const excelInitialData = useMemo(() => {
        if (!rawFolderData || !folder.fields) return [];
        const celldata = [];
        folder.fields.forEach((field, colIndex) => {
            celldata.push({
                r: 0, c: colIndex, v: { v: field, m: field, ct: { fa: "General", t: "g" }, bg: "#f3f4f6", bl: 1 }
            });
        });

        // 🛠️ FIX: Sort to match table (Newest Last)
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
                // 🛠️ FIX: Use 'r' as sort index
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
            rawFolderData.forEach(d => batch.delete(doc(db, 'shared_data', d.id)));
            newRows.forEach(r => batch.set(doc(collection(db, "shared_data")), r));
            batch.update(doc(db, 'shared_folders', folder.id), { fields: newFields });
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
            // Priority 2: Creation Time (Oldest Top, Newest Bottom)
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
                // 🛠️ FIX: Calculate correct _sortIndex for new items
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
    const handleAddColumn = async () => { /* ...Same as before... */ if (!newColumnName.trim()) return alert("Name required"); try { await updateDoc(doc(db, 'shared_folders', folder.id), { fields: [...folder.fields, newColumnName] }); setIsAddingColumn(false); setNewColumnName(''); } catch (err) { alert("Failed"); }};
    const handleDeleteColumn = async (columnName) => { /* ...Same as before... */ if (!window.confirm("Delete?")) return; try { await updateDoc(doc(db, 'shared_folders', folder.id), { fields: folder.fields.filter(f => f !== columnName) }); } catch (err) { alert("Failed"); }};

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
                        <div><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">📄 {folder.name}</h2><span className="text-[10px] uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold tracking-wider">Sheet Data</span></div>
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
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm"><tr>{folder.fields.map(f => <th key={f} className="p-3 whitespace-nowrap font-semibold text-gray-600 text-sm border-r border-gray-100 bg-gray-50 group min-w-[150px]"><div className="flex justify-between items-center gap-2"><span>{f}</span><button onClick={() => handleDeleteColumn(f)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 rounded-full hover:bg-red-50" title="Delete Column">✕</button></div></th>)}<th className="p-3 bg-gray-50 w-24 text-center font-bold text-gray-600 sticky right-0 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] z-20 border-l border-gray-200">Action</th></tr></thead>
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
                                )) : <tr><td colSpan={folder.fields.length+1} className="p-10 text-center text-gray-400 italic bg-gray-50/30">No data found.</td></tr>}
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
function SharedDocs() {
    const [selectedFile, setSelectedFile] = useState(null); 
    const [selectedSheet, setSelectedSheet] = useState(null); 

    if (selectedSheet) return <FolderDataView folder={selectedSheet} onBack={() => setSelectedSheet(null)} />;
    if (selectedFile) return <FolderBrowser isRoot={false} parentId={selectedFile.id} parentName={selectedFile.name} onSelect={(item) => setSelectedSheet(item)} onBack={() => setSelectedFile(null)} />;
    return <div className="min-h-screen bg-gray-100"><FolderBrowser isRoot={true} parentId="ROOT" parentName="Shared Docs" onSelect={(item) => { if (item.type === 'workbook') setSelectedFile(item); else setSelectedSheet(item); }} onBack={null} /></div>;
}

export default SharedDocs;