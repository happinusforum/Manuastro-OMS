// src/pages/authen/LoginPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext'; 
import { doc, getDoc } from 'firebase/firestore'; 
import { sendPasswordResetEmail } from 'firebase/auth'; 
import { db, auth } from '../../Firebase'; 

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState(''); 
    const [loading, setLoading] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false); 

    const navigate = useNavigate();
    const { login, logout } = useAuth(); 

    // 🔒 LOGIN LOGIC (UNCHANGED)
    const handleLogin = async (e, intendedRole) => {
        e.preventDefault(); 
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const userCredential = await login(email, password);
            const user = userCredential.user;

            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                await logout();
                throw new Error("User data not found in database.");
            }

            const userData = userDoc.data();
            const actualRole = userData.role;

            if (actualRole !== intendedRole) {
                await logout();
                setError(`Access Denied! You are '${actualRole.toUpperCase()}', cannot login as '${intendedRole.toUpperCase()}'.`);
                setLoading(false);
                return;
            }

            setLoading(false);
            
            let path = '/';
            if (actualRole === 'admin') path = '/admin/dashboard';
            else if (actualRole === 'hr') path = '/hr/dashboard';
            else if (actualRole === 'employee') path = '/employee/dashboard';

            navigate(path);

        } catch (err) {
            console.error("Login Failed:", err);
            let msg = "Failed to login.";
            if (err.code === 'auth/invalid-credential') msg = "Wrong Email or Password.";
            if (err.code === 'auth/too-many-requests') msg = "Too many attempts. Try later.";
            if (err.message.includes("Access Denied")) msg = err.message;
            
            setError(msg);
            setLoading(false);
        }
    };

    // 🔑 FORGOT PASSWORD LOGIC (UNCHANGED)
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email address first.");
            return;
        }
        
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("✅ Password reset link sent to your email! Check your inbox.");
            setLoading(false);
        } catch (err) {
            console.error(err);
            let msg = "Failed to send reset email.";
            if (err.code === 'auth/user-not-found') msg = "No user found with this email.";
            if (err.code === 'auth/invalid-email') msg = "Invalid email format.";
            setError(msg);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-blue-50 p-4">
            
            {/* Main Card */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                
                {/* Header Section */}
                <div className="bg-gray-900 p-8 text-center">
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-wider">
                        OMS <span className="text-white text-2xl">Login</span>
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">Office Management System</p>
                </div>

                {/* Form Section */}
                <div className="p-8">
                    
                    {/* Header Title based on Mode */}
                    <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
                        {isResetMode ? "Recover Account" : "Welcome Back"}
                    </h3>

                    {/* Messages */}
                    {message && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-600 text-sm rounded-lg font-medium text-center">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg font-medium text-center">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        {/* 🔄 CONDITIONAL RENDERING */}
                        {!isResetMode ? (
                            <>
                                {/* --- LOGIN MODE --- */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-gray-700">Password</label>
                                        <button 
                                            type="button" 
                                            onClick={() => { setIsResetMode(true); setError(''); setMessage(''); }}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        autoComplete="current-password"
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>

                                {/* Login Buttons Section */}
                                <div className="mt-8">
                                    <p className="text-xs text-gray-400 text-center mb-3 uppercase tracking-wider font-bold">Login As</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button 
                                            onClick={(e) => handleLogin(e, 'admin')} 
                                            disabled={loading} 
                                            className={`px-2 py-3 rounded-lg text-white text-sm font-bold shadow-md transition-transform active:scale-95
                                            ${loading ? 'opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'}`}
                                        >
                                            Admin
                                        </button>

                                        <button 
                                            onClick={(e) => handleLogin(e, 'hr')} 
                                            disabled={loading} 
                                            className={`px-2 py-3 rounded-lg text-white text-sm font-bold shadow-md transition-transform active:scale-95
                                            ${loading ? 'opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700'}`}
                                        >
                                            HR
                                        </button>

                                        <button 
                                            onClick={(e) => handleLogin(e, 'employee')} 
                                            disabled={loading} 
                                            className={`px-2 py-3 rounded-lg text-white text-sm font-bold shadow-md transition-transform active:scale-95
                                            ${loading ? 'opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}`}
                                        >
                                            Employee
                                        </button>
                                    </div>
                                    {loading && <p className="text-center text-xs text-gray-400 mt-2">Authenticating...</p>}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* --- RESET PASSWORD MODE --- */}
                                <button 
                                    onClick={handlePasswordReset} 
                                    disabled={loading}
                                    className={`w-full py-3 rounded-lg text-white font-bold shadow-lg transition-all
                                    ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl'}`}
                                >
                                    {loading ? 'Sending Link...' : 'Send Reset Link'}
                                </button>

                                <button 
                                    type="button"
                                    onClick={() => { setIsResetMode(false); setError(''); setMessage(''); }}
                                    className="w-full mt-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                    Back to Login
                                </button>
                            </>
                        )}
                    </form>
                </div>
                
                {/* Footer Decor */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 w-full"></div>
            </div>
            
            {/* Simple Footer */}
            <div className="fixed bottom-4 text-center text-xs text-gray-400">
                © 2025 Manuastro Systems. All rights reserved.
            </div>
        </div>
    );
}

export default LoginPage;