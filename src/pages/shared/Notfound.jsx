// src/pages/shared/NotFound.jsx

import React from 'react';
import { Link } from 'react-router-dom';

function Notfound() {
    return (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f8f8f8', minHeight: '100vh' }}>
            <h1 style={{ fontSize: '100px', color: '#dc3545' }}>404</h1>
            <h2 style={{ color: '#333' }}>Page Not Found, Mere Dost!</h2>
            <p style={{ fontSize: '1.2em', color: '#666' }}>
                Lagta hai tum galat raaste pe aa gaye ho. 🧐
            </p>
            <Link to="/login" style={{ textDecoration: 'none' }}>
                <button style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '20px' }}>
                    Go to Login / Home
                </button>
            </Link>
        </div>
    );
}

export default Notfound;