
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch
} from "firebase/firestore";
import { Student, Exam, Result, FocusPoint, User, ActivityLog, FocusAction, GradeConfig, Asset, AssetLog } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDyYC_uMQsP5HMeWTWbzaCWQyBpJrL3CmQ",
  authDomain: "epanitia-bahasaarab.firebaseapp.com",
  projectId: "epanitia-bahasaarab",
  storageBucket: "epanitia-bahasaarab.firebasestorage.app",
  messagingSenderId: "778152036364",
  appId: "1:778152036364:web:806a02e870f7276e4b4629"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Simple debounced event trigger to prevent parallel sync requests from causing excessive re-renders
let syncTimeout: NodeJS.Timeout | null = null;
function triggerSyncEvent() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    window.dispatchEvent(new Event('storage_sync'));
  }, 150);
}

export const DB_KEYS = {
  STUDENTS: 'panitia_students',
  EXAMS: 'panitia_exams',
  RESULTS: 'panitia_results',
  FOCUS: 'panitia_focus',
  FOCUS_ACTIONS: 'panitia_focus_actions',
  USERS: 'panitia_users',
  LOGS: 'panitia_logs',
  SESSION: 'panitia_session',
  CLASSES: 'panitia_classes_list',
  YEARS: 'panitia_years_list',
  GRADES: 'panitia_grade_configs',
  ASSETS: 'panitia_assets',
  ASSET_LOGS: 'panitia_asset_logs',
  INTERVENTION: 'panitia_intervention_actions',
  PBD_SKILLS: 'panitia_pbd_skills',
  PBD_RECORDS: 'panitia_pbd_records'
};

const SINGLETON_KEYS = [DB_KEYS.CLASSES, DB_KEYS.YEARS];

const DEFAULT_GRADES: GradeConfig[] = [
  { id: 'A', label: 'A', min: 80, max: 100, color: '#16a34a' },
  { id: 'B', label: 'B', min: 70, max: 79, color: '#22c55e' },
  { id: 'C', label: 'C', min: 50, max: 69, color: '#eab308' },
  { id: 'D', label: 'D', min: 40, max: 49, color: '#f97316' },
  { id: 'E', label: 'E', min: 0, max: 39, color: '#ef4444' }
];

const INITIAL_USERS: User[] = [
  { id: '1', name: 'Admin Utama', email: 'admin@school.my', role: 'ADMIN', passwordHash: 'admin123' },
  { id: '2', name: 'Ustazah Aminah', email: 'aminah@school.my', role: 'GURU', passwordHash: 'guru123' }
];

function sanitizeForFirestore(data: any): any {
  if (data === undefined || data === null) return null;
  return JSON.parse(JSON.stringify(data));
}

export const db = {
  async get<T>(key: string, initial: T): Promise<T> {
    if (key === DB_KEYS.SESSION) {
      localStorage.removeItem(DB_KEYS.SESSION);
      const sess = sessionStorage.getItem(DB_KEYS.SESSION);
      return sess ? (JSON.parse(sess) as T) : initial;
    }

    const localDataStr = localStorage.getItem(key);
    const localValue: T = localDataStr ? JSON.parse(localDataStr) : initial;

    const fetchFromFirestore = async (): Promise<T | null> => {
      const colRef = collection(firestore, key);
      const snapshot = await getDocs(colRef);
      if (snapshot.empty) return null;

      if (SINGLETON_KEYS.includes(key)) {
        const currentDoc = snapshot.docs.find(d => d.id === 'current');
        if (currentDoc) {
          const docData = currentDoc.data();
          if ('items' in docData) return docData.items as unknown as T;
        }
        return snapshot.docs[0].data() as unknown as T;
      }

      const items = snapshot.docs
        .filter(d => d.id !== 'current')
        .map(d => ({ ...d.data() }))
        .sort((a: any, b: any) => {
           const nameA = a.name || a.label || a.id || '';
           const nameB = b.name || b.label || b.id || '';
           return String(nameA).localeCompare(String(nameB));
        });
      
      return items as unknown as T;
    };

    if (localDataStr !== null) {
      // Trigger background sync to keep Firestore data fresh, without blocking UI initialization.
      setTimeout(async () => {
        try {
          const remoteValue = await fetchFromFirestore();
          if (remoteValue !== null) {
            const remoteStr = JSON.stringify(remoteValue);
            if (remoteStr !== localDataStr) {
              localStorage.setItem(key, remoteStr);
              triggerSyncEvent();
            }
          }
        } catch (e) {
          console.warn(`Background Firebase Sync Warning [${key}]:`, e);
        }
      }, 50);

      return localValue;
    } else {
      // If we don't have local cache, try fetching from Firestore with a fast 1.5s timeout.
      // This ensures we load cloud data if available, but fail gracefully without hanging if offline.
      try {
        const fetchPromise = fetchFromFirestore();
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 1500)
        );

        const remoteValue = await Promise.race([fetchPromise, timeoutPromise]);
        if (remoteValue !== null) {
          localStorage.setItem(key, JSON.stringify(remoteValue));
          return remoteValue;
        }
      } catch (e) {
        console.warn(`Initial Firebase Fetch Failed/Timed Out [${key}]. Using fallback initial state.`, e);
      }
      return initial;
    }
  },

  async set<T>(key: string, data: T): Promise<void> {
    if (key === DB_KEYS.SESSION) {
      localStorage.removeItem(DB_KEYS.SESSION);
      if (data === null || data === undefined) {
        sessionStorage.removeItem(DB_KEYS.SESSION);
      } else {
        sessionStorage.setItem(DB_KEYS.SESSION, JSON.stringify(data));
      }
      try {
        await deleteDoc(doc(firestore, DB_KEYS.SESSION, 'current'));
      } catch (e) {
        // ignore if already deleted
      }
      return;
    }

    const cleanData = sanitizeForFirestore(data);
    localStorage.setItem(key, JSON.stringify(data));
    try {
      if (data === null || data === undefined) {
        await deleteDoc(doc(firestore, key, 'current'));
        return;
      }

      if (SINGLETON_KEYS.includes(key)) {
        const docRef = doc(firestore, key, 'current');
        await setDoc(docRef, { items: cleanData });
        return;
      }

      if (Array.isArray(cleanData)) {
        if (cleanData.length > 0 && typeof cleanData[0] === 'object' && cleanData[0] !== null && 'id' in cleanData[0]) {
          const batch = writeBatch(firestore);
          for (const item of cleanData) {
            const itemDocRef = doc(firestore, key, String((item as any).id));
            batch.set(itemDocRef, item);
          }
          await batch.commit();

          try { await deleteDoc(doc(firestore, key, 'current')); } catch (e) {}
        }
      } else {
        await setDoc(doc(firestore, key, 'current'), cleanData);
      }
    } catch (e) {
      console.error(`Firebase Save Error [${key}]:`, e);
      throw e;
    }
    window.dispatchEvent(new Event('storage_sync'));
  },

  async init() {
    try {
      await deleteDoc(doc(firestore, DB_KEYS.SESSION, 'current'));
    } catch (e) {}

    // Force a fetch first to see if data exists in Cloud
    const users = await this.get(DB_KEYS.USERS, [] as User[]);
    if (users.length === 0) {
       await this.set(DB_KEYS.USERS, INITIAL_USERS);
    }
    
    const grades = await this.get(DB_KEYS.GRADES, [] as GradeConfig[]);
    if (grades.length === 0) {
       await this.set(DB_KEYS.GRADES, DEFAULT_GRADES);
    }
  },

  async addItem<T extends { id: string }>(key: string, item: T): Promise<void> {
    const cleanItem = sanitizeForFirestore(item);
    const localData = localStorage.getItem(key);
    const list = localData ? JSON.parse(localData) : [];
    localStorage.setItem(key, JSON.stringify([...list, item]));

    try {
      const itemDocRef = doc(firestore, key, String(cleanItem.id));
      await setDoc(itemDocRef, cleanItem);
    } catch (e) {
      console.error(`Firebase Add Item Error [${key}]:`, e);
      throw e;
    }
    window.dispatchEvent(new Event('storage_sync'));
  },

  async delete(key: string, id: string, updatedData: any): Promise<void> {
    localStorage.setItem(key, JSON.stringify(updatedData));
    try {
      await deleteDoc(doc(firestore, key, id));
    } catch (e) {
      console.error("Firebase Delete Error", e);
    }
    window.dispatchEvent(new Event('storage_sync'));
  },

  async deleteBulk(key: string, ids: string[], updatedData: any): Promise<void> {
    localStorage.setItem(key, JSON.stringify(updatedData));
    try {
      const batch = writeBatch(firestore);
      ids.forEach(id => {
        batch.delete(doc(firestore, key, id));
      });
      await batch.commit();
    } catch (e) {
      console.error("Firebase Bulk Delete Error", e);
    }
    window.dispatchEvent(new Event('storage_sync'));
  },

  exportAllData() {
    const data: Record<string, any> = {};
    Object.values(DB_KEYS).forEach(key => {
      const val = localStorage.getItem(key);
      if (val) data[key] = JSON.parse(val);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panitia_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importData(jsonString: string): Promise<void> {
    try {
      const data = JSON.parse(jsonString);
      const validKeys = Object.values(DB_KEYS);
      for (const key in data) {
        if (validKeys.includes(key)) {
          await this.set(key, data[key]);
        }
      }
      alert("Data berjaya diimport! Halaman dimuat semula.");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Gagal mengimport data.");
    }
  },

  async log(userId: string, userName: string, action: string): Promise<void> {
    const logs = await this.get(DB_KEYS.LOGS, [] as ActivityLog[]);
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      userName,
      action,
      timestamp: new Date().toISOString()
    };
    await this.set(DB_KEYS.LOGS, [newLog, ...logs].slice(0, 500));
  }
};
