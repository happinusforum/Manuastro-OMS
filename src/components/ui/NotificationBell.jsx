// src/components/ui/NotificationBell.jsx

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext'; 
// Ensure path is correct for your project
import { useFirestore } from '../../hooks/useFirestore'; 

const NotificationBell = () => {
    const { userProfile } = useAuth();
    const userId = userProfile?.uid;
    const [isOpen, setIsOpen] = useState(false); 
    
    // --- LOGIC STARTS (NO CHANGES) ---
    
    // 💡 FIX 1: Filters stable
    const notificationFilters = useMemo(() => {
        return userId ? [['recipientId', '==', userId]] : [];
    }, [userId]);

    // 💡 FIX 2: Options stable
    const notificationOptions = useMemo(() => {
        return { field: 'createdAt', direction: 'desc' };
    }, []);
    
    // 💡 Firestore Hook Call
    const { 
        data: notifications, 
        loading, 
        updateDocument 
    } = useFirestore(
        'notifications', 
        notificationFilters, 
        notificationOptions
    );

    // 💡 Unread count
    const unreadCount = useMemo(() => {
        if (!notifications) return 0;
        return notifications.filter(n => n.status === 'unread').length;
    }, [notifications]);

    // 💡 Mark as read handler
    const handleNotificationClick = async (notificationId) => {
        setIsOpen(false); 
        const notificationToUpdate = notifications.find(n => n.id === notificationId);

        if (notificationToUpdate && notificationToUpdate.status === 'unread') {
            try {
                await updateDocument(notificationId, { status: 'read', readAt: new Date() });
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
            }
        }
    };
    
    // 💡 Helper for Timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // --- LOGIC ENDS ---

    // ⏳ LOADING STATE (Spinner instead of Emoji)
    if (loading) {
        return (
            <div className="p-2 text-gray-400 animate-spin">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        ); 
    }

    return (
        <div className="relative inline-block">
            {/* 🔔 BELL BUTTON */}
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`
                    relative p-2 rounded-full transition-all duration-200 focus:outline-none
                    ${isOpen ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}
                `}
            >
                {/* SVG Bell Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {/* 🔴 BADGE (Unread Count) */}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-gray-900">
                        <span className="text-[10px] font-bold text-white leading-none">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                        {/* Optional Pulse Effect */}
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    </span>
                )}
            </button>

            {/* 🔽 DROPDOWN MENU */}
            {isOpen && (
                <>
                    {/* Backdrop for mobile to close when clicking outside (Transparent) */}
                    <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setIsOpen(false)}
                    ></div>

                    <div className="absolute right-0 mt-3 w-80 max-w-[90vw] bg-white rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden origin-top-right transform transition-all">
                        {/* Header */}
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-gray-700">Notifications</h4>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                {unreadCount} New
                            </span>
                        </div>
                        
                        {/* List */}
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            {!notifications || notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <p className="text-sm">No new notifications</p>
                                </div>
                            ) : (
                                notifications.slice(0, 7).map(notif => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => handleNotificationClick(notif.id)}
                                        className={`
                                            px-4 py-3 cursor-pointer border-b border-gray-100 last:border-0 transition-colors duration-150
                                            hover:bg-gray-50
                                            ${notif.status === 'unread' ? 'bg-blue-50/60' : 'bg-white'}
                                        `}
                                    >
                                        <div className="flex gap-3">
                                            {/* Status Dot */}
                                            <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notif.status === 'unread' ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                                            
                                            <div className="flex-1">
                                                <p className={`text-sm ${notif.status === 'unread' ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                                    {notif.message}
                                                </p>
                                                <p className="text-[11px] text-gray-400 mt-1">
                                                    {formatTime(notif.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {/* Footer (Optional View All) */}
                        <div className="bg-gray-50 px-4 py-2 text-center border-t border-gray-100">
                             {/* Functionality nahi thi pehle, isliye disabled style mein rakha hai bas UI fill karne ke liye, 
                                 agar page ho to Link laga dena */}
                            <span className="text-xs text-gray-400 cursor-default">Recent Updates</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;