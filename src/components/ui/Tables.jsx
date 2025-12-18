// src/components/ui/Table.jsx

import React from 'react';

// NOTE: Ye component data aur columns ko props mein leta hai.

function Tables({ data, columns, caption = "" }) {
    if (!data || data.length === 0) {
        return <p style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No records found.</p>;
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
                {caption && <caption>{caption}</caption>}
                <thead>
                    <tr>
                        {columns.map((col, index) => (
                            <th key={index} style={thStyle}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} style={trStyle}>
                            {columns.map((col, colIndex) => (
                                <td key={colIndex} style={tdStyle}>
                                    {/* Agar cell mein custom render function hai toh woh use karo, varna seedha value dikhao */}
                                    {col.render ? col.render(row) : row[col.accessor]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Internal Styles (Taaki har component mein copy-paste na karna pade)
const tableStyle = { width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' };
const thStyle = { textAlign: 'left', padding: '12px 10px', backgroundColor: '#333', color: 'white' };
const tdStyle = { padding: '10px', borderBottom: '1px solid #eee' };
const trStyle = { transition: 'background-color 0.3s' };

export default Tables;