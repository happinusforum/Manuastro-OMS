// src/components/common/ExcelEditor.jsx

import React, { useRef } from 'react';
import { Workbook } from "@fortune-sheet/react"; // 🛠️ Correct Import
import "@fortune-sheet/react/dist/index.css";    // 🛠️ Correct CSS Import

function ExcelEditor({ initialData, onSave, onClose }) {
    const ref = useRef(null);

    // ⚙️ Configuration
    const settings = {
        data: initialData && initialData.length > 0 ? initialData : [{
            name: "Sheet1",
            celldata: [], 
        }],
        onChange: (data) => {
            // console.log("User is typing...");
        },
        lang: 'en',
        showinfobar: false, 
        toolbar: true, // Heavy tools enabled
        formula: true, // Formulas enabled
        row: 50,       // Default row count
        column: 20     // Default col count
    };

    const handleSaveBtn = () => {
        // 💾 Save Logic using Ref (Correct way for @fortune-sheet/react)
        if(ref.current) {
            // Get all data from the sheet instance
            const allSheets = ref.current.getAllSheets();
            onSave(allSheets);
        } else {
            alert("Editor loading... try again.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col h-screen w-screen overflow-hidden">
            
            {/* --- CUSTOM TOP BAR --- */}
            <div className="h-16 bg-gray-900 text-white flex justify-between items-center px-6 shadow-md shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-wide">Advanced Editor</h2>
                        <p className="text-xs text-gray-400">Performing Heavy Tasks 🚀</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveBtn}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 transition transform active:scale-95"
                    >
                        <span>💾</span> Save Changes
                    </button>
                </div>
            </div>

            {/* --- SHEET AREA --- */}
            <div className="flex-1 w-full h-full relative">
                {/* Ref is passed here to access sheet methods */}
                <Workbook ref={ref} {...settings} />
            </div>
        </div>
    );
}

export default ExcelEditor;