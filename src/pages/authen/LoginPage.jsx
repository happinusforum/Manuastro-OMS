// src/pages/authen/LoginPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext'; // ⬅️ Context import kiya

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    
    // 💡 CHANGE: 'login' function Context se nikala (Jo Persistence handle karega)
    const { login } = useAuth(); 

    const handleLogin = async (e, intendedRole) => {
        e.preventDefault(); 
        setError('');
        setLoading(true);

        try {
            // 💡 FIX: Ab hum Context wala login function call kar rahe hain
            // Yeh function background mein 'setPersistence(SESSION)' chalayega
            await login(email, password); 
            
            setLoading(false);
            
            // 2. Client-side Redirection (As requested)
            // Note: Asli security AuthGuard mein hoti hai, yeh bas UX ke liye hai.
            let path = '/';
            if (intendedRole === 'admin') path = '/admin/dashboard';
            else if (intendedRole === 'hr') path = '/hr/dashboard';
            else if (intendedRole === 'employee') path = '/employee/dashboard';

            navigate(path);

        } catch (err) {
            console.error("Login Failed:", err);
            // Error message ko user-friendly banaya
            let msg = "Failed to login.";
            if (err.code === 'auth/invalid-credential') msg = "Wrong Email or Password.";
            if (err.code === 'auth/too-many-requests') msg = "Too many attempts. Try later.";
            
            setError(msg);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-gray-200 rounded-lg shadow">
            <h2 className="text-2xl font-semibold text-gray-800">OMS Login</h2>
            <form>
                <label className="sr-only">Email</label>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />

                <label className="sr-only">Password</label>
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                
                {error && <p className="text-sm font-medium text-red-600 mt-3">Error: {error}</p>}
                
                {/* 🚀 BUTTONS FOR TESTING ROLES 🚀 */}
                <div className="flex gap-3 justify-between mt-6">
                    <button 
                        type="button"
                        onClick={(e) => handleLogin(e, 'admin')} 
                        disabled={loading}
                        className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${loading ? 'opacity-60 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                        {loading ? '...' : 'Admin'}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={(e) => handleLogin(e, 'hr')} 
                        disabled={loading}
                        className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${loading ? 'opacity-60 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        HR
                    </button>
                    
                    <button 
                        type="button"
                        onClick={(e) => handleLogin(e, 'employee')} 
                        disabled={loading}
                        className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${loading ? 'opacity-60 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700'}`}
                    >
                        Employee
                    </button>
                </div>
            </form>
        </div>
    );
}

export default LoginPage;