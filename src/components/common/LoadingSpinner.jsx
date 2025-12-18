// src/components/ui/LoadingSpinner.jsx

import React from 'react';

// Simple CSS Spinner (Inline Styles)
const spinnerStyle = {
  border: '4px solid #f3f3f3',
  borderTop: '4px solid #3498db', // Blue top border for spinning effect
  borderRadius: '50%',
  width: '30px',
  height: '30px',
  animation: 'spin 1s linear infinite', // CSS animation property
  margin: '20px auto',
};

// Global CSS animation definition (Aise animations ko hum generally index.css mein daalte hain, 
// par abhi inline style ke liye component mein define karte hain.)
const styleSheet = document.styleSheets[0];
const keyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Check karte hain ki animation already added hai ya nahi
if (styleSheet && !styleSheet.cssRules[0]?.cssText.includes('@keyframes spin')) {
  try {
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
  } catch(e) {
    // Ye browser restrictions ke wajah se fail ho sakta hai, toh isko ignore karte hain
  }
}

function LoadingSpinner({ size = '30px', message = "Loading data..." }) {
    
    // Size aur message props se control kar sakte hain
    const dynamicSpinnerStyle = {
        ...spinnerStyle,
        width: size,
        height: size,
    };

    return (
        <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={dynamicSpinnerStyle}></div>
            <p style={{ color: '#555', fontSize: '0.9em' }}>{message}</p>
        </div>
    );
}

export default LoadingSpinner;