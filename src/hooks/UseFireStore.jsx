// src/hooks/useFirestore.js (FINAL FIX - SHOWS ALL USERS)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../Firebase'; 
import { 
    collection, 
    query as firestoreQuery, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    addDoc, 
    updateDoc,
    where, 
    orderBy 
} from 'firebase/firestore'; 

// 👇 CHANGE: Default value 'null' se hata kar '[]' (Empty Array) kar di
export const useFirestore = (collectionName, queryFilters = [], orderByOptions = null) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dependencies memoize kiye
    const filterKey = useMemo(() => JSON.stringify(queryFilters), [queryFilters]);
    const orderKey = useMemo(() => JSON.stringify(orderByOptions), [orderByOptions]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        
        // 🛑 Check: Agar Collection nahi hai YA Filter explicitly NULL hai -> Ruk jao
        // Note: Ab default [] hai, toh ye check fail hoga aur query chalegi (Jo hum chahte hain)
        if (!collectionName || queryFilters === null) {
            setLoading(false);
            setData([]); 
            return; 
        }

        // 🛑 Check: Invalid filter structure safety
        if (Array.isArray(queryFilters)) {
            const hasInvalidFilter = queryFilters.some(f => 
                f && f.length === 3 && (f[2] === undefined || f[2] === null || f[2] === '')
            );

            if (hasInvalidFilter) {
                setLoading(false);
                return; 
            }
        }
        
        try {
            let queryArgs = [];
            
            // Filters Add karo (Agar hain toh)
            if (Array.isArray(queryFilters)) {
                queryFilters.forEach(filter => {
                    if (Array.isArray(filter) && filter.length === 3) {
                        queryArgs.push(where(filter[0], filter[1], filter[2]));
                    }
                });
            }
            
            // Sorting Add karo
            if (orderByOptions && orderByOptions.field) {
                const direction = orderByOptions.direction === 'desc' ? 'desc' : 'asc';
                queryArgs.push(orderBy(orderByOptions.field, direction));
            }

            // Firestore Listener
            const ref = collection(db, collectionName);
            const q = queryArgs.length > 0 ? firestoreQuery(ref, ...queryArgs) : ref;

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const results = snapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data() 
                }));
                setData(results);
                setLoading(false);
            }, (err) => {
                console.error("Firestore Error:", err);
                setError(err.message);
                setLoading(false);
            });

            return () => unsubscribe();

        } catch (err) {
            console.error("Hook Setup Error:", err);
            setError(err.message);
            setLoading(false);
        }
        
    }, [collectionName, filterKey, orderKey]); 

    // --- CRUD Operations ---

    const deleteDocument = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, collectionName, id));
            return true;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }, [collectionName]);

    const addDocument = useCallback(async (document) => {
        try {
            const docRef = await addDoc(collection(db, collectionName), document);
            return docRef.id;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }, [collectionName]);

    const updateDocument = useCallback(async (id, updates) => {
        try {
            await updateDoc(doc(db, collectionName, id), updates);
            return true;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }, [collectionName]);

    return { data, loading, error, deleteDocument, addDocument, updateDocument };
};