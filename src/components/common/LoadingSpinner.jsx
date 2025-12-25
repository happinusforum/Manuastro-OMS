// src/components/common/LoadingSpinner.jsx (MODERN UI + TAILWIND ANIMATION)

import React from 'react';

function LoadingSpinner({ message = "Loading data...", fullScreen = false }) {
    
    // 💡 Container Style Logic
    // Agar 'fullScreen' prop true hai, toh poori screen cover karega (overlay).
    // Nahi toh, jis div mein hai wahan center hoga.
    const containerClasses = fullScreen 
        ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-all duration-300"
        : "flex flex-col items-center justify-center py-10 w-full";

    return (
        <div className={containerClasses}>
            {/* 🌀 Modern Spinner Ring */}
            <div className="relative w-12 h-12 md:w-16 md:h-16">
                {/* Background Ring (Faint) */}
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                
                {/* Spinning Ring (Color) */}
                <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                
                {/* Optional: Inner Pulse Dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                </div>
            </div>

            {/* 📝 Loading Text with Pulse Effect */}
            {message && (
                <p className="mt-4 text-sm md:text-base font-semibold text-gray-600 animate-pulse tracking-wide">
                    {message}
                </p>
            )}
        </div>
    );
}

export default LoadingSpinner;