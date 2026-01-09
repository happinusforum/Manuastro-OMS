import { useState, useEffect, useRef } from 'react';
// 👇 Yahan maine change kiya hai: 'db' ko import kiya teri firebase file se
import { db } from '../Firebase'; 
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

export const useCollection = (collectionName, _query, _orderBy) => {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);

  // References ko cache kar rahe hain taaki infinite loop na bane
  const queryRef = useRef(_query).current;
  const orderByRef = useRef(_orderBy).current;

  useEffect(() => {
    setIsPending(true);

    // 👇 Yahan 'projectFirestore' ki jagah 'db' use kiya hai
    let ref = collection(db, collectionName);

    // Agar koi query (filter) hai toh apply karo
    if (queryRef) {
      ref = query(ref, where(...queryRef));
    }
    
    // Agar sorting karni hai
    if (orderByRef) {
      ref = query(ref, orderBy(...orderByRef));
    }

    // Real-time listener
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      let results = [];
      snapshot.docs.forEach(doc => {
        results.push({ ...doc.data(), id: doc.id });
      });

      // State update
      setDocuments(results);
      setError(null);
      setIsPending(false);
    }, (error) => {
      console.log("Error fetching data:", error);
      setError('Data fetch nahi ho paya bhai');
      setIsPending(false);
    });

    // Cleanup function
    return () => unsubscribe();

  }, [collectionName, queryRef, orderByRef]);

  return { documents, error, isPending };
};