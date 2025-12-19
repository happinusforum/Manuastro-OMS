// src/components/common/OfficeData.jsx (WITH CSV IMPORT FEATURE)

import React, { useState, useMemo, useRef } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// ----------------------------------------------------------------------
// 🔧 HELPER: NATIVE CSV PARSER (Bina Library ke)
// ----------------------------------------------------------------------
const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return null; // Kam se kam Header aur 1 Row honi chaiye

    // 1. Headers nikalo (First Row)
    // Regex explanation: Handles commas inside quotes (e.g., "Delhi, India")
    const headers = lines[0].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g).map(h => h.replace(/^"|"$/g, '').trim());

    // 2. Data Rows nikalo
    const data = lines.slice(1).map(line => {
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        
        let rowObj = {};
        headers.forEach((header, index) => {
            // Quotes hata kar value save karo
            const val = values[index] ? values[index].replace(/^"|"$/g, '').trim() : '';
            rowObj[header] = val;
        });
        return rowObj;
    });

    return { headers, data };
};

// ----------------------------------------------------------------------
// 📂 SUB-COMPONENT: FOLDER LIST & IMPORT
// ----------------------------------------------------------------------
const FolderList = ({ onSelectFolder }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isImporting, setIsImporting] = useState(false); // For Import Loading
    const [newFolderName, setNewFolderName] = useState('');
    const [newFields, setNewFields] = useState(['Name', 'Contact Number', 'Address']); 
    
    // File Input Reference
    const fileInputRef = useRef(null);

    const { data: folders, loading, addDocument, deleteDocument } = useFirestore('office_folders');
    
    // Hum direct 'office_data' mein bhi add karenge import ke time
    const { addDocument: addDataEntry } = useFirestore('office_data');

    // --- IMPORT CSV LOGIC ---
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        const folderName = file.name.replace(/\.csv$/i, ''); // "vendor.csv" -> "vendor"

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvText = event.target.result;
            const parsed = parseCSV(csvText);

            if (!parsed) {
                alert("Invalid CSV or Empty File!");
                setIsImporting(false);
                return;
            }

            try {
                // 1. Folder Create karo (Automatically)
                const folderId = await addDocument({
                    name: folderName,
                    fields: parsed.headers, // CSV Headers ban gaye fields
                    createdAt: new Date()
                });

                // 2. Data Entry (Bulk Upload)
                // Note: Agar 1000 rows hain toh thoda time lag sakta hai
                const uploadPromises = parsed.data.map(row => {
                    return addDataEntry({
                        ...row,
                        folderId: folderId,
                        createdAt: new Date()
                    });
                });

                await Promise.all(uploadPromises);

                alert(`Success! Imported "${folderName}" with ${parsed.data.length} entries.`);
                
            } catch (error) {
                console.error(error);
                alert("Error importing data: " + error.message);
            } finally {
                setIsImporting(false);
                if(fileInputRef.current) fileInputRef.current.value = ""; // Reset input
            }
        };

        reader.readAsText(file);
    };

    // --- MANUAL CREATE LOGIC ---
    const handleAddField = () => setNewFields([...newFields, '']);
    const handleFieldChange = (index, value) => {
        const updated = [...newFields];
        updated[index] = value;
        setNewFields(updated);
    };
    const handleRemoveField = (index) => {
        const updated = newFields.filter((_, i) => i !== index);
        setNewFields(updated);
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        const cleanedFields = newFields.filter(f => f.trim() !== '');
        if (!newFolderName || cleanedFields.length === 0) {
            alert("Folder name and fields are required!");
            return;
        }
        await addDocument({
            name: newFolderName,
            fields: cleanedFields,
            createdAt: new Date()
        });
        setIsCreating(false);
        setNewFolderName('');
        setNewFields(['Name', 'Contact Number', 'Address']);
    };

    const handleDeleteFolder = async (e, id) => {
        e.stopPropagation();
        if(window.confirm("Delete folder? All data inside will be lost access!")) {
            await deleteDocument(id);
        }
    };

    if (isImporting) {
        return <LoadingSpinner message="Importing CSV Data... Please wait." />;
    }

    return (
        <div className="p-6">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Office Data Folders</h2>
                
                <div className="flex gap-3">
                    {/* HIDDEN FILE INPUT */}
                    <input 
                        type="file" 
                        accept=".csv" 
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />

                    {/* IMPORT BUTTON */}
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2"
                    >
                        📂 Import CSV
                    </button>

                    {/* CREATE BUTTON */}
                    <button 
                        onClick={() => setIsCreating(true)} 
                        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                    >
                        + Create Manually
                    </button>
                </div>
            </div>

            {/* MANUAL CREATION FORM */}
            {isCreating && (
                <div className="bg-white p-6 rounded shadow-md mb-8 border border-blue-200">
                    <h3 className="font-bold mb-4">Create New Data Folder</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-1">Folder Name</label>
                        <input 
                            type="text" 
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="e.g. Vendor List"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Define Fields</label>
                        {newFields.map((field, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={field}
                                    onChange={(e) => handleFieldChange(index, e.target.value)}
                                    className="flex-1 p-2 border rounded"
                                    placeholder={`Field ${index + 1}`}
                                />
                                <button type="button" onClick={() => handleRemoveField(index)} className="text-red-500 font-bold px-2">✕</button>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddField} className="text-sm text-blue-600 font-bold mt-1">+ Add Field</button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handleCreateFolder} className="bg-green-600 text-white px-4 py-2 rounded">Create</button>
                        <button onClick={() => setIsCreating(false)} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
                    </div>
                </div>
            )}

            {/* FOLDER GRID */}
            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {folders?.map(folder => (
                        <div 
                            key={folder.id} 
                            onClick={() => onSelectFolder(folder)}
                            className="bg-white p-6 rounded-xl shadow cursor-pointer hover:shadow-lg transition border border-gray-100 group relative"
                        >
                            <div className="text-4xl mb-2">📂</div>
                            <h3 className="font-bold text-lg text-gray-800">{folder.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 truncate">
                                {folder.fields?.join(', ') || 'No fields'}
                            </p>
                            
                            <button 
                                onClick={(e) => handleDeleteFolder(e, folder.id)}
                                className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 transition hover:text-red-600"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                    {folders?.length === 0 && <p className="text-gray-500 col-span-3 text-center">No folders yet. Import CSV or Create one!</p>}
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 📄 SUB-COMPONENT: DATA TABLE & CRUD (SAME AS BEFORE)
// ----------------------------------------------------------------------
const FolderDataView = ({ folder, onBack }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);

    const dataFilters = useMemo(() => [['folderId', '==', folder.id]], [folder.id]);
    const { data: folderData, loading, addDocument, updateDocument, deleteDocument } = useFirestore('office_data', dataFilters);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDocument(editingId, { ...formData, updatedAt: new Date() });
            } else {
                await addDocument({ 
                    ...formData, 
                    folderId: folder.id, 
                    createdAt: new Date() 
                });
            }
            setIsAdding(false);
            setEditingId(null);
            setFormData({});
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const handleEdit = (record) => {
        setFormData(record);
        setEditingId(record.id);
        setIsAdding(true);
    };

    // CSV Export Logic
    const handleDownloadCSV = () => {
        if (!folderData || folderData.length === 0) {
            alert("No data to export!");
            return;
        }
        const headers = [...folder.fields, "Created Date"];
        const rows = folderData.map(row => {
            return [
                ...folder.fields.map(field => `"${row[field] || ''}"`),
                row.createdAt?.toDate ? row.createdAt.toDate().toLocaleDateString() : '-'
            ].join(',');
        });
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${folder.name}_Export.csv`;
        link.click();
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-gray-500 hover:text-gray-800 text-lg font-bold">⬅ Back</button>
                    <h2 className="text-2xl font-bold text-gray-800">📂 {folder.name}</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDownloadCSV} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">
                        📥 Export CSV
                    </button>
                    <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({}); }} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
                        + Add Entry
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-gray-50 p-6 rounded border border-blue-200 mb-6 shadow-inner">
                    <h3 className="font-bold mb-4">{editingId ? 'Edit Entry' : 'Add New Entry'}</h3>
                    <form onSubmit={handleSave}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {folder.fields.map((field) => (
                                <div key={field}>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">{field}</label>
                                    <input 
                                        type="text"
                                        value={formData[field] || ''}
                                        onChange={(e) => handleInputChange(field, e.target.value)}
                                        className="w-full p-2 border rounded bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder={`Enter ${field}`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded shadow">Save</button>
                            <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className="bg-gray-300 text-gray-700 px-6 py-2 rounded">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded shadow overflow-x-auto flex-1">
                {loading ? <LoadingSpinner /> : (
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                {folder.fields.map(field => (
                                    <th key={field} className="p-4 font-semibold text-gray-700 whitespace-nowrap">{field}</th>
                                ))}
                                <th className="p-4 font-semibold text-gray-700 w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {folderData?.length === 0 ? (
                                <tr><td colSpan={folder.fields.length + 1} className="p-8 text-center text-gray-400">No data found.</td></tr>
                            ) : (
                                folderData?.map(row => (
                                    <tr key={row.id} className="border-b hover:bg-gray-50">
                                        {folder.fields.map(field => (
                                            <td key={field} className="p-4 text-sm text-gray-800">
                                                {row[field] || '-'}
                                            </td>
                                        ))}
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleEdit(row)} className="text-blue-500 hover:underline">Edit</button>
                                            <button onClick={async () => { if(window.confirm("Delete row?")) await deleteDocument(row.id) }} className="text-red-500 hover:underline">Del</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 🚀 MAIN COMPONENT
// ----------------------------------------------------------------------
function OfficeData() {
    const [selectedFolder, setSelectedFolder] = useState(null);

    return (
        <div className="min-h-screen bg-gray-50">
            {selectedFolder ? (
                <FolderDataView folder={selectedFolder} onBack={() => setSelectedFolder(null)} />
            ) : (
                <FolderList onSelectFolder={setSelectedFolder} />
            )}
        </div>
    );
}

export default OfficeData;