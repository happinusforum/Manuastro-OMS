// src/pages/admin/Settings.jsx

import React, { useState } from 'react';


function Settings() {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maxLeaves, setMaxLeaves] = useState(20);

    // NOTE: Yahan ka data Firestore ki 'settings' collection mein save hoga.

    const handleSaveSettings = () => {
        alert(`Settings saved! Maintenance: ${maintenanceMode}, Max Leaves: ${maxLeaves}`);
        // 💡 Yahan Firestore updateDoc function use hoga.
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
           
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
               
                <main style={{ padding: '20px', backgroundColor: '#f4f7f9', flexGrow: 1 }}>
                    <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
                        Admin Global Settings
                    </h2>

                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '600px' }}>
                        
                        <h3>Global Configuration</h3>
                        
                        {/* 1. Leave Policy Setting */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontWeight: 'bold' }}>Max Annual Leaves (per employee)</label>
                            <input type="number" value={maxLeaves} onChange={(e) => setMaxLeaves(e.target.value)} style={{ padding: '8px', width: '100px', marginTop: '5px' }} />
                        </div>

                        {/* 2. Maintenance Mode Setting */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                            <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} id="maintenance" />
                            <label htmlFor="maintenance" style={{ marginLeft: '10px', color: maintenanceMode ? 'red' : 'green' }}>
                                Enable Maintenance Mode (Disable login for all non-admins)
                            </label>
                        </div>

                        <button onClick={handleSaveSettings} style={submitButtonStyle}>
                            Save Settings
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
}

const submitButtonStyle = { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '20px' };
export default Settings;