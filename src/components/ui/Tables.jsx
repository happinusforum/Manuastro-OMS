// src/components/ui/Table.jsx

import React from 'react';

// NOTE: Logic same hai, bas Tailwind CSS se sundar banaya hai.
// Data aur Columns props wahi rahenge.

function Tables({ data, columns, caption = "" }) {
    
    // --- 1. EMPTY STATE (No Data) ---
    if (!data || data.length === 0) {
        return (
            <div className="w-full p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gray-50">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">No records found</h3>
                <p className="mt-1 text-sm text-gray-500">There is no data to display at the moment.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* --- 2. RESPONSIVE WRAPPER ---
               Mobile pe horizontal scroll automatic aa jayega 'overflow-x-auto' se.
            */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200">
                    
                    {/* Caption / Title */}
                    {caption && (
                        <caption className="px-6 py-4 text-left text-lg font-bold text-gray-800 bg-gray-50/50 border-b border-gray-100">
                            {caption}
                        </caption>
                    )}

                    {/* Table Head */}
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((col, index) => (
                                <th 
                                    key={index} 
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((row, rowIndex) => (
                            <tr 
                                key={rowIndex} 
                                className="hover:bg-gray-50 transition-colors duration-150 ease-in-out"
                            >
                                {columns.map((col, colIndex) => (
                                    <td 
                                        key={colIndex} 
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                                    >
                                        {/* Logic same as before: Render function or direct Accessor */}
                                        {col.render ? col.render(row) : row[col.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Tables;