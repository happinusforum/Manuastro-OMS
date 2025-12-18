import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore'; // Tera fixed hook
import LoadingSpinner from '../../components/common/LoadingSpinner';

// ----------------------------------------------------------------------
// 📂 SUB-COMPONENT: FOLDER LIST & CREATION
// ----------------------------------------------------------------------
const FolderList = ({ onSelectFolder }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    // Default fields start mein
    const [newFields, setNewFields] = useState(['Name', 'Contact Number', 'Address']); 

    const { data: folders, loading, addDocument, deleteDocument } = useFirestore('office_folders');

    // Field add karne ka logic
    const handleAddField = () => {
        setNewFields([...newFields, '']);
    };

    // Field ka naam change karne ka logic
    const handleFieldChange = (index, value) => {
        const updated = [...newFields];
        updated[index] = value;
        setNewFields(updated);
    };

    // Field remove karna
    const handleRemoveField = (index) => {
        const updated = newFields.filter((_, i) => i !== index);
        setNewFields(updated);
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        // Empty fields hata do
        const cleanedFields = newFields.filter(f => f.trim() !== '');
        
        if (!newFolderName || cleanedFields.length === 0) {
            alert("Folder name and at least one field are required!");
            return;
        }

        await addDocument({
            name: newFolderName,
            fields: cleanedFields, // Schema save kar rahe hain
            createdAt: new Date()
        });

        setIsCreating(false);
        setNewFolderName('');
        setNewFields(['Name', 'Contact Number', 'Address']);
    };

    const handleDeleteFolder = async (e, id) => {
        e.stopPropagation(); // Parent click rokne ke liye
        if(window.confirm("Delete folder? All data inside will be lost access!")) {
            await deleteDocument(id);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Office Data Folders</h2>
                <button 
                    onClick={() => setIsCreating(true)} 
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                >
                    + Create New Folder
                </button>
            </div>

            {/* FOLDER CREATION FORM */}
            {isCreating && (
                <div className="bg-white p-6 rounded shadow-md mb-8 border border-blue-200">
                    <h3 className="font-bold mb-4">Create New Data Folder</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-1">Folder Name (e.g., Vendor List)</label>
                        <input 
                            type="text" 
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Enter folder name..."
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Define Fields (Columns)</label>
                        {newFields.map((field, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={field}
                                    onChange={(e) => handleFieldChange(index, e.target.value)}
                                    className="flex-1 p-2 border rounded"
                                    placeholder={`Field ${index + 1}`}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveField(index)}
                                    className="text-red-500 font-bold px-2 hover:bg-red-50 rounded"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button 
                            type="button" 
                            onClick={handleAddField}
                            className="text-sm text-blue-600 font-bold mt-1 hover:underline"
                        >
                            + Add Another Field
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handleCreateFolder} className="bg-green-600 text-white px-4 py-2 rounded">Create Folder</button>
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
                            <p className="text-xs text-gray-500 mt-1">{folder.fields.join(', ')}</p>
                            
                            <button 
                                onClick={(e) => handleDeleteFolder(e, folder.id)}
                                className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 transition hover:text-red-600"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                    {folders?.length === 0 && <p className="text-gray-500 col-span-3 text-center">No folders yet. Create one!</p>}
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 📄 SUB-COMPONENT: DATA TABLE & CRUD (INSIDE FOLDER)
// ----------------------------------------------------------------------
const FolderDataView = ({ folder, onBack }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);

    // Filter data by folderId
    const dataFilters = useMemo(() => [['folderId', '==', folder.id]], [folder.id]);
    const { data: folderData, loading, addDocument, updateDocument, deleteDocument } = useFirestore('office_data', dataFilters);

    // Handle Input Change for Dynamic Fields
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Save Data
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDocument(editingId, { ...formData, updatedAt: new Date() });
            } else {
                await addDocument({ 
                    ...formData, 
                    folderId: folder.id, // Link data to this folder
                    createdAt: new Date() 
                });
            }
            setIsAdding(false);
            setEditingId(null);
            setFormData({});
        } catch (err) {
            alert("Error saving: " + err.message);
        }
    };

    // Edit Logic
    const handleEdit = (record) => {
        setFormData(record);
        setEditingId(record.id);
        setIsAdding(true);
    };

    // CSV Download Logic (Dynamic)
    const handleDownloadCSV = () => {
        if (!folderData || folderData.length === 0) {
            alert("No data to export!");
            return;
        }
        
        // Headers: Defined fields + CreatedAt
        const headers = [...folder.fields, "Created Date"];
        
        const rows = folderData.map(row => {
            return [
                ...folder.fields.map(field => `"${row[field] || ''}"`), // Data fields
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
                    <button onClick={onBack} className="text-gray-500 hover:text-gray-800 text-lg">⬅ Back</button>
                    <h2 className="text-2xl font-bold text-gray-800">📂 {folder.name}</h2>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleDownloadCSV}
                        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
                    >
                        📥 CSV
                    </button>
                    <button 
                        onClick={() => { setIsAdding(true); setEditingId(null); setFormData({}); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                    >
                        + Add Entry
                    </button>
                </div>
            </div>

            {/* DYNAMIC FORM */}
            {isAdding && (
                <div className="bg-gray-50 p-6 rounded border border-blue-200 mb-6 shadow-inner">
                    <h3 className="font-bold mb-4">{editingId ? 'Edit Entry' : 'Add New Entry'}</h3>
                    <form onSubmit={handleSave}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Folder ke fields ke hisaab se input boxes banao */}
                            {folder.fields.map((field) => (
                                <div key={field}>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">{field}</label>
                                    <input 
                                        type="text"
                                        value={formData[field] || ''}
                                        onChange={(e) => handleInputChange(field, e.target.value)}
                                        className="w-full p-2 border rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder={`Enter ${field}`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded shadow">Save</button>
                            <button 
                                type="button" 
                                onClick={() => { setIsAdding(false); setEditingId(null); }} 
                                className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* DYNAMIC TABLE */}
            <div className="bg-white rounded shadow overflow-x-auto flex-1">
                {loading ? <LoadingSpinner /> : (
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                {/* Dynamic Headers */}
                                {folder.fields.map(field => (
                                    <th key={field} className="p-4 font-semibold text-gray-700">{field}</th>
                                ))}
                                <th className="p-4 font-semibold text-gray-700 w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {folderData?.length === 0 ? (
                                <tr><td colSpan={folder.fields.length + 1} className="p-8 text-center text-gray-400">No data found in this folder.</td></tr>
                            ) : (
                                folderData?.map(row => (
                                    <tr key={row.id} className="border-b hover:bg-gray-50">
                                        {/* Dynamic Cells */}
                                        {folder.fields.map(field => (
                                            <td key={field} className="p-4 text-sm text-gray-800">
                                                {row[field] || '-'}
                                            </td>
                                        ))}
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleEdit(row)} className="text-blue-500 hover:underline">Edit</button>
                                            <button 
                                                onClick={async () => {
                                                    if(window.confirm("Delete row?")) await deleteDocument(row.id)
                                                }} 
                                                className="text-red-500 hover:underline"
                                            >
                                                Del
                                            </button>
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
                // Agar folder select kiya hai toh Data View dikhao
                <FolderDataView 
                    folder={selectedFolder} 
                    onBack={() => setSelectedFolder(null)} 
                />
            ) : (
                // Nahi toh Folders ki list dikhao
                <FolderList onSelectFolder={setSelectedFolder} />
            )}
        </div>
    );
}

export default OfficeData;