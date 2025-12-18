// src/components/ui/NotificationBell.jsx (FINAL STABLE CODE)

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext'; 
// ⬅️ Import path check kar lena (UseFireStore vs useFirestore)
import { useFirestore } from '../../hooks/useFirestore'; 

const NotificationBell = () => {
    const { userProfile } = useAuth();
    const userId = userProfile?.uid;
    const [isOpen, setIsOpen] = useState(false); 
    
    // 💡 FIX 1: Filters ko useMemo se STABLE banaya (CRASH FIX)
    const notificationFilters = useMemo(() => {
        // Agar userId nahi hai, to empty array return karo (null nahi)
        return userId ? [['recipientId', '==', userId]] : [];
    }, [userId]);

    // 💡 FIX 2: Options ko bhi memoize kiya
    const notificationOptions = useMemo(() => {
        return { field: 'createdAt', direction: 'desc' };
    }, []);
    
    // 💡 Firestore Hook Call (Ab stable arguments ke saath)
    const { 
        data: notifications, 
        loading, 
        updateDocument 
    } = useFirestore(
        'notifications', 
        notificationFilters, 
        notificationOptions
    );

    // 💡 Unread count (Safe check)
    const unreadCount = useMemo(() => {
        if (!notifications) return 0;
        return notifications.filter(n => n.status === 'unread').length;
    }, [notifications]);

    // 💡 Mark as read
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
    
    // 💡 Helper for Timestamp (Safe handling)
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <span style={bellStyle}>⏳</span>; 
    }

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                style={bellButtonStyle}
            >
                <span style={bellStyle}>🔔</span>
                {unreadCount > 0 && (
                    <span style={badgeStyle}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={dropdownStyle}>
                    <h4 style={{ margin: '0 0 10px', paddingBottom: '5px', borderBottom: '1px solid #eee' }}>
                        Notifications ({unreadCount} New)
                    </h4>
                    
                    {!notifications || notifications.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '0.9em', textAlign: 'center', padding: '10px' }}>
                            No new notifications.
                        </p>
                    ) : (
                        notifications.slice(0, 7).map(notif => (
                            <div 
                                key={notif.id} 
                                onClick={() => handleNotificationClick(notif.id)}
                                style={{
                                    ...notificationItemStyle,
                                    backgroundColor: notif.status === 'unread' ? '#eef7ff' : 'white', 
                                    fontWeight: notif.status === 'unread' ? '600' : 'normal'
                                }}
                            >
                                <p style={{ margin: 0, fontSize: '0.9em' }}>{notif.message}</p>
                                <span style={{ fontSize: '0.7em', color: '#888' }}>
                                    {formatTime(notif.createdAt)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// Internal Styles (Same as before)
const bellStyle = { fontSize: '1.5rem', cursor: 'pointer', color: '#ffc107' };
const bellButtonStyle = { background: 'transparent', border: 'none', position: 'relative', cursor: 'pointer', padding: '5px' };
const badgeStyle = { position: 'absolute', top: 0, right: 0, backgroundColor: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.75rem', lineHeight: 1, transform: 'translate(50%, -50%)' };
const dropdownStyle = { position: 'absolute', right: 0, top: '100%', width: '300px', backgroundColor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px', padding: '15px', zIndex: 100, marginTop: '10px' };
const notificationItemStyle = { padding: '10px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background-color 0.2s', borderRadius: '4px' };

export default NotificationBell;