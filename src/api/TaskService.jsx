// src/api/taskService.js

import { db } from '../Firebase';
import { doc, addDoc, collection } from 'firebase/firestore'; 

// 💡 Admin/HR dwara naya task assign karna
export const assignNewTask = async (assignedToUid, title, dueDate) => {
    try {
        const taskData = {
            title,
            assignedToId: assignedToUid,
            status: 'Pending',
            createdAt: new Date(),
            dueDate: dueDate || null
        };
        
        await addDoc(collection(db, "tasks"), taskData); 
        return true;
    } catch (error) {
        throw new Error(error.message);
    }
};

// NOTE: Baki CRUD operations (Update status/Delete) useFirestore hook mein hain.