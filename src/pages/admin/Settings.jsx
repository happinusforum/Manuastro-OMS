// src/pages/admin/Settings.jsx

import React, { useState } from 'react';

function Settings() {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maxLeaves, setMaxLeaves] = useState(20);

    // NOTE: Yahan ka data Firestore ki 'settings' collection mein save hoga.
    // Logic 100% same hai.

    const handleSaveSettings = () => {
        alert(`Settings saved! Maintenance: ${maintenanceMode}, Max Leaves: ${maxLeaves}`);
        // 💡 Yahan Firestore updateDoc function use hoga.
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            
            {/* Header Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">System Configuration</h2>
                <p className="text-sm text-gray-500 mt-1">Manage global settings and policies for the organization.</p>
            </div>

            {/* Main Settings Card */}
            <div className="max-w-2xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Card Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-700">Global Settings</h3>
                </div>

                <div className="p-6 space-y-8">
                    
                    {/* 1. Leave Policy Setting */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Annual Leaves <span className="text-gray-400 font-normal">(Per Employee)</span>
                        </label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={maxLeaves} 
                                onChange={(e) => setMaxLeaves(e.target.value)} 
                                className="w-full sm:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-700"
                                placeholder="e.g. 20"
                            />
                            <span className="absolute left-[calc(50%-2rem)] sm:left-[calc(50%-1rem)] top-2.5 text-gray-400 text-sm hidden sm:block">
                                days/year
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Changing this will update the leave quota for all employees in the next cycle.
                        </p>
                    </div>

                    <hr className="border-gray-100" />

                    {/* 2. Maintenance Mode Setting (Toggle Switch) */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <h4 className="font-medium text-gray-900">Maintenance Mode</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Disable login access for all non-admin users.
                            </p>
                        </div>
                        
                        {/* Custom Toggle Switch UI */}
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={maintenanceMode} 
                                onChange={(e) => setMaintenanceMode(e.target.checked)} 
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                    </div>
                    {/* Status Text Indicator */}
                    <div className={`text-sm font-medium flex items-center gap-2 ${maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                        <span className={`h-2 w-2 rounded-full ${maintenanceMode ? 'bg-red-600 animate-pulse' : 'bg-green-600'}`}></span>
                        System Status: {maintenanceMode ? 'Maintenance Mode ON ⚠️' : 'Operational ✅'}
                    </div>

                </div>

                {/* Card Footer / Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={handleSaveSettings} 
                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
}

export default Settings;