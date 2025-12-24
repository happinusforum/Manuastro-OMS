// src/pages/authen/LoginPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext'; 
import { doc, getDoc } from 'firebase/firestore'; // ⬅️ Database fetch karne ke liye
import { db } from '../../Firebase'; // ⬅️ Firestore instance

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    
    // 💡 Logout bhi chahiye taaki agar role match na ho toh user ko kick out kar sakein
    const { login, logout } = useAuth(); 

    const handleLogin = async (e, intendedRole) => {
        e.preventDefault(); 
        setError('');
        setLoading(true);

        try {
            // 1. Firebase Auth se Login Check karo (Email/Password sahi hai ya nahi)
            const userCredential = await login(email, password);
            const user = userCredential.user;

            // 2. Ab Database se User ka Asli Role pata karo
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                await logout(); // Data nahi mila toh logout
                throw new Error("User data not found in database.");
            }

            const userData = userDoc.data();
            const actualRole = userData.role; // Database mein jo role hai (e.g., 'employee')

            // 3. 🔒 SECURITY CHECK: Role Match Logic
            // Agar user 'employee' hai par 'admin' button dabaya -> ERROR
            if (actualRole !== intendedRole) {
                await logout(); // Turant Logout karo
                setError(`Access Denied! You are registered as '${actualRole.toUpperCase()}', but trying to login as '${intendedRole.toUpperCase()}'.`);
                setLoading(false);
                return; // Code yahin rok do
            }

            // 4. Agar sab sahi hai, toh Dashboard par bhejo
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
            if (err.message.includes("Access Denied")) msg = err.message; // Role error dikhane ke liye
            
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
                
                {error && <p className="text-sm font-bold text-red-600 mt-3 p-2 bg-red-50 border border-red-200 rounded">{error}</p>}
                
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