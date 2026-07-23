import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Lead, Task, ActivityLog, ChatMessage } from './types';
import { initialLeads, initialTasks, initialLogs, initialChats } from './utils';

// Helper to determine if we should fallback to LocalStorage
const STORAGE_PREFIX = 'academius_crm_';

function getLocal<T>(key: string, fallback: T): T {
  const data = localStorage.getItem(STORAGE_PREFIX + key);
  return data ? JSON.parse(data) : fallback;
}

function setLocal<T>(key: string, data: T): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
}

// ---------------------- LEADS SERVICE ----------------------

export async function getLeads(): Promise<Lead[]> {
  try {
    const colRef = collection(db, 'leads');
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      // Self-seeding: Populate Firestore with initial leads
      console.log('Firestore leads collection is empty. Seeding database with initial leads...');
      const batch = writeBatch(db);
      initialLeads.forEach((lead) => {
        const docRef = doc(db, 'leads', lead.id);
        batch.set(docRef, lead);
      });
      await batch.commit();
      
      // Update local storage backup
      setLocal('leads', initialLeads);
      return initialLeads;
    }

    const leads: Lead[] = [];
    snapshot.forEach((doc) => {
      leads.push(doc.data() as Lead);
    });
    
    // Update local storage backup
    setLocal('leads', leads);
    return leads;
  } catch (error) {
    console.warn('Firebase error fetching leads, falling back to LocalStorage:', error);
    return getLocal<Lead[]>('leads', initialLeads);
  }
}

export async function saveLead(lead: Lead): Promise<void> {
  try {
    const docRef = doc(db, 'leads', lead.id);
    await setDoc(docRef, lead, { merge: true });
    
    // Sync local
    const localLeads = getLocal<Lead[]>('leads', initialLeads);
    const index = localLeads.findIndex(l => l.id === lead.id);
    if (index >= 0) {
      localLeads[index] = lead;
    } else {
      localLeads.push(lead);
    }
    setLocal('leads', localLeads);
  } catch (error) {
    console.error('Firebase save lead error, saving to LocalStorage only:', error);
    const localLeads = getLocal<Lead[]>('leads', initialLeads);
    const index = localLeads.findIndex(l => l.id === lead.id);
    if (index >= 0) {
      localLeads[index] = lead;
    } else {
      localLeads.push(lead);
    }
    setLocal('leads', localLeads);
  }
}

export async function deleteLeadDoc(leadId: string): Promise<void> {
  try {
    const docRef = doc(db, 'leads', leadId);
    await deleteDoc(docRef);
    
    // Sync local
    const localLeads = getLocal<Lead[]>('leads', initialLeads);
    setLocal('leads', localLeads.filter(l => l.id !== leadId));
  } catch (error) {
    console.error('Firebase delete lead error, removing from LocalStorage:', error);
    const localLeads = getLocal<Lead[]>('leads', initialLeads);
    setLocal('leads', localLeads.filter(l => l.id !== leadId));
  }
}

// ---------------------- TASKS SERVICE ----------------------

export async function getTasks(): Promise<Task[]> {
  try {
    const colRef = collection(db, 'tasks');
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log('Firestore tasks collection is empty. Seeding tasks...');
      const batch = writeBatch(db);
      initialTasks.forEach((task) => {
        const docRef = doc(db, 'tasks', task.id);
        batch.set(docRef, task);
      });
      await batch.commit();
      
      setLocal('tasks', initialTasks);
      return initialTasks;
    }

    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      tasks.push(doc.data() as Task);
    });
    
    setLocal('tasks', tasks);
    return tasks;
  } catch (error) {
    console.warn('Firebase error fetching tasks, using LocalStorage:', error);
    return getLocal<Task[]>('tasks', initialTasks);
  }
}

export async function saveTask(task: Task): Promise<void> {
  try {
    const docRef = doc(db, 'tasks', task.id);
    await setDoc(docRef, task, { merge: true });
    
    const localTasks = getLocal<Task[]>('tasks', initialTasks);
    const index = localTasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
      localTasks[index] = task;
    } else {
      localTasks.push(task);
    }
    setLocal('tasks', localTasks);
  } catch (error) {
    console.error('Firebase task save error, saving local:', error);
    const localTasks = getLocal<Task[]>('tasks', initialTasks);
    const index = localTasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
      localTasks[index] = task;
    } else {
      localTasks.push(task);
    }
    setLocal('tasks', localTasks);
  }
}

export async function deleteTaskDoc(taskId: string): Promise<void> {
  try {
    const docRef = doc(db, 'tasks', taskId);
    await deleteDoc(docRef);
    
    const localTasks = getLocal<Task[]>('tasks', initialTasks);
    setLocal('tasks', localTasks.filter(t => t.id !== taskId));
  } catch (error) {
    console.error('Firebase task delete error:', error);
    const localTasks = getLocal<Task[]>('tasks', initialTasks);
    setLocal('tasks', localTasks.filter(t => t.id !== taskId));
  }
}

// ---------------------- ACTIVITY LOG SERVICE ----------------------

export async function getActivityLogs(): Promise<ActivityLog[]> {
  try {
    const colRef = collection(db, 'logs');
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log('Seeding activity logs...');
      const batch = writeBatch(db);
      initialLogs.forEach((log) => {
        const docRef = doc(db, 'logs', log.id);
        batch.set(docRef, log);
      });
      await batch.commit();
      
      setLocal('logs', initialLogs);
      return initialLogs;
    }

    const logs: ActivityLog[] = [];
    snapshot.forEach((doc) => {
      logs.push(doc.data() as ActivityLog);
    });
    
    // Sort descending by date & time
    logs.sort((a, b) => {
      const dateA = `${a.tanggal}T${a.jam}`;
      const dateB = `${b.tanggal}T${b.jam}`;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    setLocal('logs', logs);
    return logs;
  } catch (error) {
    console.warn('Firebase error logs, fetching local:', error);
    const localLogs = getLocal<ActivityLog[]>('logs', initialLogs);
    return localLogs.sort((a, b) => {
      const dateA = `${a.tanggal}T${a.jam}`;
      const dateB = `${b.tanggal}T${b.jam}`;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }
}

export async function addActivityLog(log: ActivityLog): Promise<void> {
  try {
    const docRef = doc(db, 'logs', log.id);
    await setDoc(docRef, log);
    
    const localLogs = getLocal<ActivityLog[]>('logs', initialLogs);
    localLogs.unshift(log);
    setLocal('logs', localLogs);
  } catch (error) {
    console.error('Firebase log save error:', error);
    const localLogs = getLocal<ActivityLog[]>('logs', initialLogs);
    localLogs.unshift(log);
    setLocal('logs', localLogs);
  }
}

// ---------------------- CHAT CHANNELS SERVICE ----------------------

export async function getChats(leadId: string): Promise<ChatMessage[]> {
  try {
    const colRef = collection(db, 'chats');
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log('Seeding chats...');
      const batch = writeBatch(db);
      initialChats.forEach((chat) => {
        const docRef = doc(db, 'chats', chat.id);
        batch.set(docRef, chat);
      });
      await batch.commit();
      
      setLocal('chats', initialChats);
      return initialChats.filter(c => c.leadId === leadId);
    }

    const chats: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      chats.push(doc.data() as ChatMessage);
    });

    setLocal('chats', chats);
    return chats.filter(c => c.leadId === leadId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.warn('Firebase error fetching chats, reverting local:', error);
    const localChats = getLocal<ChatMessage[]>('chats', initialChats);
    return localChats.filter(c => c.leadId === leadId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}

export async function addChat(chat: ChatMessage): Promise<void> {
  try {
    const docRef = doc(db, 'chats', chat.id);
    await setDoc(docRef, chat);
    
    const localChats = getLocal<ChatMessage[]>('chats', initialChats);
    localChats.push(chat);
    setLocal('chats', localChats);
  } catch (error) {
    console.error('Firebase chat add error:', error);
    const localChats = getLocal<ChatMessage[]>('chats', initialChats);
    localChats.push(chat);
    setLocal('chats', localChats);
  }
}
