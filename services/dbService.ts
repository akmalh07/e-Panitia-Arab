
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
import { User, ActivityLog, GradeConfig } from '../types';

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

// Debounced local sync event (reads from localStorage only, never triggers Firestore reads)
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
function triggerSyncEvent() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    window.dispatchEvent(new Event('storage_sync'));
  }, 100);
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
  PBD_RECORDS: 'panitia_pbd_records',
  ANNUAL_REPORTS: 'panitia_annual_reports',
  SIGNATORIES: 'panitia_signatories'
};

const SINGLETON_KEYS = [DB_KEYS.CLASSES, DB_KEYS.YEARS];

// Persistent sync metadata keys (survive browser restarts so unsynced local data is never overwritten)
const DIRTY_KEYS_STORAGE = 'panitia_dirty_keys';
const PENDING_DELETES_STORAGE = 'panitia_pending_deletes';
const LAST_CLOUD_SYNC_STORAGE = 'panitia_last_cloud_sync';
const QUOTA_COOLDOWN_KEY = 'panitia_firestore_quota_until';
const QUOTA_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const WRITE_COALESCE_MS = 250; // Coalesces rapid typing into one atomic Firestore batch

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

// Session tracking & per-key locks
const syncedKeysThisSession = new Set<string>();
const inFlightFetches = new Map<string, Promise<unknown>>();
const lastCloudSnapshots = new Map<string, Map<string, string>>();
const lastCloudRawValues = new Map<string, string>();
const flushLocks = new Map<string, Promise<void>>();
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingResolvers = new Map<string, Array<() => void>>();
let initPromise: Promise<void> | null = null;
let listenersRegistered = false;

function safeParseLocal<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) return null as unknown as T;
  return JSON.parse(JSON.stringify(data));
}

function isQuotaCooldownActive(): boolean {
  try {
    const untilStr = sessionStorage.getItem(QUOTA_COOLDOWN_KEY);
    if (!untilStr) return false;
    const until = Number(untilStr);
    if (Date.now() < until) return true;
    sessionStorage.removeItem(QUOTA_COOLDOWN_KEY);
  } catch {
    // ignore storage errors
  }
  return false;
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === 'resource-exhausted' ||
    (typeof e.message === 'string' && /quota exceeded|resource-exhausted/i.test(e.message))
  );
}

function tripQuotaCooldown(err: unknown): boolean {
  if (!isQuotaError(err)) return false;
  const alreadyActive = isQuotaCooldownActive();
  try {
    sessionStorage.setItem(QUOTA_COOLDOWN_KEY, String(Date.now() + QUOTA_COOLDOWN_MS));
  } catch {
    // ignore
  }
  if (!alreadyActive) {
    console.warn('Firestore quota exceeded. Local cache mode active; pending changes will sync once quota resets.');
  }
  return true;
}

function getDirtyKeys(): Set<string> {
  return new Set(safeParseLocal<string[]>(localStorage.getItem(DIRTY_KEYS_STORAGE), []));
}

function markKeyDirty(key: string) {
  const dirty = getDirtyKeys();
  dirty.add(key);
  localStorage.setItem(DIRTY_KEYS_STORAGE, JSON.stringify(Array.from(dirty)));
}

function clearKeyDirty(key: string) {
  const dirty = getDirtyKeys();
  if (dirty.delete(key)) {
    localStorage.setItem(DIRTY_KEYS_STORAGE, JSON.stringify(Array.from(dirty)));
  }
}

function getPendingDeletesMap(): Record<string, string[]> {
  return safeParseLocal<Record<string, string[]>>(localStorage.getItem(PENDING_DELETES_STORAGE), {});
}

function addPendingDeletes(key: string, ids: string[]) {
  if (ids.length === 0) return;
  const map = getPendingDeletesMap();
  const existing = new Set(map[key] || []);
  ids.forEach(id => existing.add(String(id)));
  map[key] = Array.from(existing);
  localStorage.setItem(PENDING_DELETES_STORAGE, JSON.stringify(map));
}

function removePendingDeletes(key: string, ids: string[]) {
  if (ids.length === 0) return;
  const map = getPendingDeletesMap();
  if (!map[key]) return;
  const toRemove = new Set(ids.map(String));
  const remaining = map[key].filter(id => !toRemove.has(id));
  if (remaining.length > 0) {
    map[key] = remaining;
  } else {
    delete map[key];
  }
  localStorage.setItem(PENDING_DELETES_STORAGE, JSON.stringify(map));
}

function getLastCloudSyncTs(key: string): number {
  const map = safeParseLocal<Record<string, number>>(localStorage.getItem(LAST_CLOUD_SYNC_STORAGE), {});
  return map[key] || 0;
}

function setLastCloudSyncTs(key: string, ts: number) {
  const map = safeParseLocal<Record<string, number>>(localStorage.getItem(LAST_CLOUD_SYNC_STORAGE), {});
  map[key] = ts;
  localStorage.setItem(LAST_CLOUD_SYNC_STORAGE, JSON.stringify(map));
}

function isIdObjectArray(arr: unknown): arr is Array<Record<string, any> & { id: string | number }> {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    typeof arr[0] === 'object' &&
    arr[0] !== null &&
    'id' in arr[0]
  );
}

function getItemTimestamp(item: any): number {
  if (!item || typeof item !== 'object') return 0;
  const raw = item.updatedAt || item.date || item.timestamp;
  if (!raw) return 0;
  const parsed = Date.parse(String(raw));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getLogicalCompositeKey(key: string, item: any): string | null {
  if (!item || typeof item !== 'object') return null;
  if (key === DB_KEYS.RESULTS && item.studentId && item.examId) {
    return `${item.studentId}__${item.examId}`;
  }
  if (key === DB_KEYS.PBD_RECORDS && item.studentId && item.skillId) {
    return `${item.studentId}__${item.skillId}`;
  }
  return null;
}

/**
 * Conflict-safe merge for arrays of { id } records.
 * Guarantees local dirty edits and recently created records are NEVER overwritten by stale Firestore snapshots.
 */
function mergeIdArrays(
  key: string,
  localArr: Array<Record<string, any>>,
  remoteArr: Array<Record<string, any>>,
  pendingDeletes: Set<string>,
  lastSyncTs: number,
  isDirty: boolean
): Array<Record<string, any>> {
  const localById = new Map<string, Record<string, any>>();
  for (const item of localArr) {
    if (item && typeof item === 'object' && 'id' in item) {
      localById.set(String(item.id), item);
    }
  }

  const mergedById = new Map<string, Record<string, any>>();

  for (const rItem of remoteArr) {
    if (!rItem || typeof rItem !== 'object' || !('id' in rItem)) continue;
    const id = String(rItem.id);
    if (pendingDeletes.has(id)) continue;

    const lItem = localById.get(id);
    if (lItem) {
      const lTs = getItemTimestamp(lItem);
      const rTs = getItemTimestamp(rItem);
      if (isDirty) {
        // Keep local when dirty unless remote clearly has a strictly newer timestamp
        mergedById.set(id, rTs > lTs ? rItem : lItem);
      } else {
        mergedById.set(id, lTs > rTs ? lItem : rItem);
      }
    } else {
      mergedById.set(id, rItem);
    }
  }

  // Preserve local items not yet in remote if dirty, never synced under baseline, or newer than lastSyncTs
  for (const [id, lItem] of localById.entries()) {
    if (!mergedById.has(id)) {
      const lTs = getItemTimestamp(lItem);
      if (isDirty || lastSyncTs === 0 || lTs === 0 || lTs > lastSyncTs) {
        mergedById.set(id, lItem);
      }
    }
  }

  // Deduplicate logical composite keys (e.g. studentId+examId) preferring newer/local item
  const compositeWinner = new Map<string, { id: string; item: Record<string, any> }>();
  for (const [id, item] of mergedById.entries()) {
    const compKey = getLogicalCompositeKey(key, item);
    if (!compKey) continue;
    const existing = compositeWinner.get(compKey);
    if (!existing) {
      compositeWinner.set(compKey, { id, item });
    } else {
      const existingTs = getItemTimestamp(existing.item);
      const currTs = getItemTimestamp(item);
      const currIsLocal = localById.has(id);
      const existingIsLocal = localById.has(existing.id);
      if (currTs > existingTs || (currTs === existingTs && currIsLocal && !existingIsLocal)) {
        mergedById.delete(existing.id);
        compositeWinner.set(compKey, { id, item });
      } else {
        mergedById.delete(id);
      }
    }
  }

  return Array.from(mergedById.values()).sort((a: any, b: any) => {
    if (key === DB_KEYS.LOGS && a.timestamp && b.timestamp) {
      return String(b.timestamp).localeCompare(String(a.timestamp));
    }
    const nameA = a.name || a.label || a.id || '';
    const nameB = b.name || b.label || b.id || '';
    return String(nameA).localeCompare(String(nameB));
  });
}

function recordCloudSnapshot(key: string, value: unknown) {
  if (isIdObjectArray(value)) {
    const snap = new Map<string, string>();
    for (const item of value) {
      snap.set(String(item.id), JSON.stringify(item));
    }
    lastCloudSnapshots.set(key, snap);
  } else if (Array.isArray(value) && value.length === 0) {
    lastCloudSnapshots.set(key, new Map());
  } else {
    lastCloudRawValues.set(key, JSON.stringify(value));
  }
}

async function fetchCollectionFromFirestore<T>(key: string): Promise<T | null> {
  if (isQuotaCooldownActive()) return null;

  const existing = inFlightFetches.get(key);
  if (existing) return existing as Promise<T | null>;

  const fetchPromise = (async (): Promise<T | null> => {
    try {
      const colRef = collection(firestore, key);
      const snapshot = await getDocs(colRef);
      syncedKeysThisSession.add(key);

      if (snapshot.empty) {
        lastCloudSnapshots.set(key, new Map());
        return null;
      }

      if (SINGLETON_KEYS.includes(key)) {
        const currentDoc = snapshot.docs.find(d => d.id === 'current');
        if (currentDoc) {
          const docData = currentDoc.data();
          if ('items' in docData) {
            recordCloudSnapshot(key, docData.items);
            return docData.items as unknown as T;
          }
        }
        const firstData = snapshot.docs[0].data();
        recordCloudSnapshot(key, firstData);
        return firstData as unknown as T;
      }

      const currentDoc = snapshot.docs.find(d => d.id === 'current');
      if (currentDoc && snapshot.docs.length === 1) {
        const docData = currentDoc.data();
        const val = 'items' in docData ? docData.items : docData;
        recordCloudSnapshot(key, val);
        return val as unknown as T;
      }

      const items = snapshot.docs
        .filter(d => d.id !== 'current')
        .map(d => ({ ...d.data() }))
        .sort((a: any, b: any) => {
          if (key === DB_KEYS.LOGS && a.timestamp && b.timestamp) {
            return String(b.timestamp).localeCompare(String(a.timestamp));
          }
          const nameA = a.name || a.label || a.id || '';
          const nameB = b.name || b.label || b.id || '';
          return String(nameA).localeCompare(String(nameB));
        });

      recordCloudSnapshot(key, items);
      return items as unknown as T;
    } catch (e) {
      if (!tripQuotaCooldown(e)) {
        console.warn(`Firebase Fetch Warning [${key}]:`, e);
      }
      return null;
    } finally {
      inFlightFetches.delete(key);
    }
  })();

  inFlightFetches.set(key, fetchPromise);
  return fetchPromise;
}

async function commitBatchedOperations(
  ops: Array<{ type: 'set'; ref: ReturnType<typeof doc>; data: any } | { type: 'delete'; ref: ReturnType<typeof doc> }>
): Promise<void> {
  if (ops.length === 0 || isQuotaCooldownActive()) return;

  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(firestore);
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data);
      } else {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

async function flushKeyToFirestoreNow(key: string): Promise<void> {
  if (key === DB_KEYS.SESSION || isQuotaCooldownActive()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  const runFlush = async () => {
    const rawAtStart = localStorage.getItem(key);
    const localData = safeParseLocal<any>(rawAtStart, null);
    const cleanData = sanitizeForFirestore(localData);
    const pendingDeletesMap = getPendingDeletesMap();
    const pendingDeletes = new Set(pendingDeletesMap[key] || []);

    try {
      if (localData === null || localData === undefined) {
        await deleteDoc(doc(firestore, key, 'current'));
        lastCloudRawValues.delete(key);
        if (localStorage.getItem(key) === rawAtStart) {
          clearKeyDirty(key);
        }
        setLastCloudSyncTs(key, Date.now());
        return;
      }

      if (SINGLETON_KEYS.includes(key)) {
        const serialized = JSON.stringify(cleanData);
        if (lastCloudRawValues.get(key) !== serialized) {
          await setDoc(doc(firestore, key, 'current'), { items: cleanData });
          lastCloudRawValues.set(key, serialized);
        }
        if (localStorage.getItem(key) === rawAtStart) {
          clearKeyDirty(key);
        }
        setLastCloudSyncTs(key, Date.now());
        return;
      }

      if (Array.isArray(cleanData)) {
        const hasIdItems = isIdObjectArray(cleanData);
        let cloudSnap = lastCloudSnapshots.get(key);

        // If we have no in-memory cloud snapshot yet (e.g. fresh page load with dirty keys from yesterday),
        // fetch remote first so we merge instead of clobbering, and only push the delta!
        if (hasIdItems && !cloudSnap) {
          const remoteItems = await fetchCollectionFromFirestore<any[]>(key);
          if (remoteItems && Array.isArray(remoteItems)) {
            const merged = mergeIdArrays(
              key,
              cleanData,
              remoteItems,
              pendingDeletes,
              getLastCloudSyncTs(key),
              true
            );
            const mergedClean = sanitizeForFirestore(merged);
            const mergedRaw = JSON.stringify(mergedClean);
            if (mergedRaw !== localStorage.getItem(key)) {
              localStorage.setItem(key, mergedRaw);
              triggerSyncEvent();
            }
            cloudSnap = lastCloudSnapshots.get(key) || new Map();
            const ops: Array<{ type: 'set'; ref: ReturnType<typeof doc>; data: any } | { type: 'delete'; ref: ReturnType<typeof doc> }> = [];
            for (const item of mergedClean) {
              const id = String(item.id);
              const s = JSON.stringify(item);
              if (cloudSnap.get(id) !== s) {
                ops.push({ type: 'set', ref: doc(firestore, key, id), data: item });
              }
            }
            for (const delId of pendingDeletes) {
              if (cloudSnap.has(delId)) {
                ops.push({ type: 'delete', ref: doc(firestore, key, delId) });
              }
            }
            await commitBatchedOperations(ops);
            recordCloudSnapshot(key, mergedClean);
            removePendingDeletes(key, Array.from(pendingDeletes));
            if (localStorage.getItem(key) === mergedRaw || localStorage.getItem(key) === rawAtStart) {
              clearKeyDirty(key);
            }
            setLastCloudSyncTs(key, Date.now());
            return;
          }
          cloudSnap = lastCloudSnapshots.get(key) || new Map();
        }

        if (hasIdItems || (cleanData.length === 0 && (cloudSnap?.size || pendingDeletes.size) > 0)) {
          const prevMap = cloudSnap || new Map<string, string>();
          const nextIds = new Set<string>();
          const ops: Array<{ type: 'set'; ref: ReturnType<typeof doc>; data: any } | { type: 'delete'; ref: ReturnType<typeof doc> }> = [];

          for (const item of cleanData) {
            if (!item || typeof item !== 'object' || !('id' in item)) continue;
            const id = String(item.id);
            nextIds.add(id);
            const serialized = JSON.stringify(item);
            if (prevMap.get(id) !== serialized) {
              ops.push({ type: 'set', ref: doc(firestore, key, id), data: item });
            }
          }

          for (const oldId of prevMap.keys()) {
            if (!nextIds.has(oldId)) {
              ops.push({ type: 'delete', ref: doc(firestore, key, oldId) });
            }
          }
          for (const delId of pendingDeletes) {
            if (!nextIds.has(delId) && !prevMap.has(delId)) {
              ops.push({ type: 'delete', ref: doc(firestore, key, delId) });
            }
          }

          await commitBatchedOperations(ops);
          recordCloudSnapshot(key, cleanData);
          removePendingDeletes(key, Array.from(pendingDeletes));
          if (localStorage.getItem(key) === rawAtStart) {
            clearKeyDirty(key);
          }
          setLastCloudSyncTs(key, Date.now());
          return;
        }

        // Array of objects without 'id' (e.g. PanitiaFileState[]) or empty array
        const serialized = JSON.stringify({ items: cleanData });
        if (lastCloudRawValues.get(key) !== serialized) {
          await setDoc(doc(firestore, key, 'current'), { items: cleanData });
          lastCloudRawValues.set(key, serialized);
        }
        if (localStorage.getItem(key) === rawAtStart) {
          clearKeyDirty(key);
        }
        setLastCloudSyncTs(key, Date.now());
        return;
      }

      const serialized = JSON.stringify(cleanData);
      if (lastCloudRawValues.get(key) !== serialized) {
        await setDoc(doc(firestore, key, 'current'), cleanData as any);
        lastCloudRawValues.set(key, serialized);
      }
      if (localStorage.getItem(key) === rawAtStart) {
        clearKeyDirty(key);
      }
      setLastCloudSyncTs(key, Date.now());
    } catch (e) {
      if (tripQuotaCooldown(e)) return;
      console.error(`Firebase Save Error [${key}]:`, e);
      // Keep key dirty so it retries automatically on next sync/reload!
    }
  };

  // Serialize flushes per key so writes never race out of order
  const prevLock = flushLocks.get(key) || Promise.resolve();
  const nextLock = prevLock.then(runFlush, runFlush);
  flushLocks.set(key, nextLock);
  await nextLock;
}

function scheduleCoalescedFlush(key: string): Promise<void> {
  const existingTimer = pendingTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);

  return new Promise<void>((resolve) => {
    const resolvers = pendingResolvers.get(key) || [];
    resolvers.push(resolve);
    pendingResolvers.set(key, resolvers);

    const timer = setTimeout(async () => {
      pendingTimers.delete(key);
      const waiters = pendingResolvers.get(key) || [];
      pendingResolvers.delete(key);
      try {
        await flushKeyToFirestoreNow(key);
      } finally {
        waiters.forEach(r => r());
      }
    }, WRITE_COALESCE_MS);

    pendingTimers.set(key, timer);
  });
}

async function flushAllPendingNow(): Promise<void> {
  // Trigger any debounced timers immediately
  for (const [key, timer] of pendingTimers.entries()) {
    clearTimeout(timer);
    pendingTimers.delete(key);
    const waiters = pendingResolvers.get(key) || [];
    pendingResolvers.delete(key);
    flushKeyToFirestoreNow(key).finally(() => waiters.forEach(r => r()));
  }

  // Also flush any persisted dirty keys (e.g. from offline/quota yesterday)
  const dirtyKeys = getDirtyKeys();
  for (const key of dirtyKeys) {
    if (key !== DB_KEYS.SESSION) {
      await flushKeyToFirestoreNow(key);
    }
  }
}

function ensureLifecycleListeners() {
  if (listenersRegistered || typeof window === 'undefined') return;
  listenersRegistered = true;

  window.addEventListener('online', () => {
    void flushAllPendingNow();
  });

  window.addEventListener('pagehide', () => {
    void flushAllPendingNow();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushAllPendingNow();
    }
  });
}

ensureLifecycleListeners();

export const db = {
  async get<T>(
    key: string,
    initial: T,
    options?: { skipRemote?: boolean; forceRemote?: boolean }
  ): Promise<T> {
    if (key === DB_KEYS.SESSION) {
      localStorage.removeItem(DB_KEYS.SESSION);
      const sess = sessionStorage.getItem(DB_KEYS.SESSION);
      return sess ? (JSON.parse(sess) as T) : initial;
    }

    const localDataStr = localStorage.getItem(key);
    const localValue: T = localDataStr ? safeParseLocal(localDataStr, initial) : initial;

    const shouldSkipRemote =
      options?.skipRemote ||
      isQuotaCooldownActive() ||
      (!options?.forceRemote && syncedKeysThisSession.has(key));

    if (shouldSkipRemote) {
      return localValue;
    }

    if (localDataStr !== null) {
      syncedKeysThisSession.add(key);
      setTimeout(async () => {
        const isDirty = getDirtyKeys().has(key);
        if (isDirty) {
          // Local has unsynced edits: push/merge UP to Firestore instead of overwriting local!
          await flushKeyToFirestoreNow(key);
          return;
        }

        const remoteValue = await fetchCollectionFromFirestore<T>(key);
        if (remoteValue === null) {
          // If local already has non-empty data and baseline sync hadn't occurred, push local up safely
          const latestLocal = safeParseLocal<any>(localStorage.getItem(key), null);
          if (Array.isArray(latestLocal) && latestLocal.length > 0 && getLastCloudSyncTs(key) === 0) {
            markKeyDirty(key);
            await flushKeyToFirestoreNow(key);
          }
          return;
        }

        const currentLocalStr = localStorage.getItem(key);
        const currentLocal = safeParseLocal<any>(currentLocalStr, initial);

        if (isIdObjectArray(currentLocal) && Array.isArray(remoteValue)) {
          const pendingDeletes = new Set(getPendingDeletesMap()[key] || []);
          const lastSyncTs = getLastCloudSyncTs(key);
          const merged = mergeIdArrays(key, currentLocal, remoteValue as any[], pendingDeletes, lastSyncTs, false);
          const mergedStr = JSON.stringify(merged);

          if (mergedStr !== currentLocalStr) {
            localStorage.setItem(key, mergedStr);
            triggerSyncEvent();
          }

          // If local held extra unsynced records (e.g. lastSyncTs === 0 rescue), push them to Firestore
          const remoteStr = JSON.stringify(remoteValue);
          if (mergedStr !== remoteStr) {
            markKeyDirty(key);
            await flushKeyToFirestoreNow(key);
          } else {
            setLastCloudSyncTs(key, Date.now());
          }
        } else {
          const remoteStr = JSON.stringify(remoteValue);
          if (remoteStr !== currentLocalStr && !getDirtyKeys().has(key)) {
            localStorage.setItem(key, remoteStr);
            triggerSyncEvent();
          }
          setLastCloudSyncTs(key, Date.now());
        }
      }, 50);

      return localValue;
    } else {
      // No local cache yet: try fetching from Firestore with a fast 1.5s timeout
      syncedKeysThisSession.add(key);
      try {
        const fetchPromise = fetchCollectionFromFirestore<T>(key);
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 1500)
        );

        const remoteValue = await Promise.race([fetchPromise, timeoutPromise]);
        if (remoteValue !== null) {
          localStorage.setItem(key, JSON.stringify(remoteValue));
          setLastCloudSyncTs(key, Date.now());
          return remoteValue;
        }
      } catch (e) {
        if (!tripQuotaCooldown(e)) {
          console.warn(`Initial Firebase Fetch Failed/Timed Out [${key}]. Using fallback initial state.`);
        }
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
      return;
    }

    const prevRaw = localStorage.getItem(key);
    const prevData = safeParseLocal<any>(prevRaw, null);
    const nextRaw = JSON.stringify(data);

    // Detect any removed IDs so deletions are tracked cleanly
    if (Array.isArray(prevData) && Array.isArray(data)) {
      const nextIds = new Set(
        data
          .filter((item): item is Record<string, any> => !!item && typeof item === 'object' && 'id' in item)
          .map(item => String(item.id))
      );
      const removedIds: string[] = [];
      for (const item of prevData) {
        if (item && typeof item === 'object' && 'id' in item) {
          const id = String(item.id);
          if (!nextIds.has(id)) removedIds.push(id);
        }
      }
      if (removedIds.length > 0) {
        addPendingDeletes(key, removedIds);
      }
      // If any previously deleted ID is re-added, remove it from pendingDeletes
      if (nextIds.size > 0) {
        removePendingDeletes(key, Array.from(nextIds));
      }
    }

    // Immediate synchronous local save (0ms)
    localStorage.setItem(key, nextRaw);
    syncedKeysThisSession.add(key);
    markKeyDirty(key);
    triggerSyncEvent();

    if (isQuotaCooldownActive()) return;

    await scheduleCoalescedFlush(key);
  },

  async flush(key?: string): Promise<void> {
    if (key) {
      const timer = pendingTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        pendingTimers.delete(key);
      }
      const waiters = pendingResolvers.get(key) || [];
      pendingResolvers.delete(key);
      await flushKeyToFirestoreNow(key);
      waiters.forEach(r => r());
    } else {
      await flushAllPendingNow();
    }
  },

  hasPendingSync(): boolean {
    return getDirtyKeys().size > 0 || pendingTimers.size > 0;
  },

  async init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        // Flush any dirty changes left from a previous session right away
        await flushAllPendingNow();

        const users = await this.get(DB_KEYS.USERS, [] as User[]);
        if (users.length === 0) {
          await this.set(DB_KEYS.USERS, INITIAL_USERS);
        }

        const grades = await this.get(DB_KEYS.GRADES, [] as GradeConfig[]);
        if (grades.length === 0) {
          await this.set(DB_KEYS.GRADES, DEFAULT_GRADES);
        }
      } catch (e) {
        if (!tripQuotaCooldown(e)) {
          console.warn('DB Init warning (continuing with local cache):', e);
        }
      }
    })();
    return initPromise;
  },

  async addItem<T extends { id: string }>(key: string, item: T): Promise<void> {
    const cleanItem = sanitizeForFirestore(item);
    const localData = localStorage.getItem(key);
    const list = safeParseLocal<T[]>(localData, []);
    localStorage.setItem(key, JSON.stringify([...list, item]));
    syncedKeysThisSession.add(key);
    removePendingDeletes(key, [String(item.id)]);
    markKeyDirty(key);
    triggerSyncEvent();

    if (isQuotaCooldownActive()) return;

    try {
      const itemDocRef = doc(firestore, key, String(cleanItem.id));
      await setDoc(itemDocRef, cleanItem);
      const snap = lastCloudSnapshots.get(key) || new Map<string, string>();
      snap.set(String(cleanItem.id), JSON.stringify(cleanItem));
      lastCloudSnapshots.set(key, snap);
      clearKeyDirty(key);
      setLastCloudSyncTs(key, Date.now());
    } catch (e) {
      if (tripQuotaCooldown(e)) return;
      console.error(`Firebase Add Item Error [${key}]:`, e);
    }
  },

  async delete(key: string, id: string, updatedData: any): Promise<void> {
    localStorage.setItem(key, JSON.stringify(updatedData));
    syncedKeysThisSession.add(key);
    addPendingDeletes(key, [id]);
    markKeyDirty(key);
    triggerSyncEvent();

    if (isQuotaCooldownActive()) return;

    try {
      await deleteDoc(doc(firestore, key, id));
      lastCloudSnapshots.get(key)?.delete(String(id));
      removePendingDeletes(key, [id]);
      clearKeyDirty(key);
      setLastCloudSyncTs(key, Date.now());
    } catch (e) {
      if (!tripQuotaCooldown(e)) {
        console.error("Firebase Delete Error", e);
      }
    }
  },

  async deleteBulk(key: string, ids: string[], updatedData: any): Promise<void> {
    localStorage.setItem(key, JSON.stringify(updatedData));
    syncedKeysThisSession.add(key);
    addPendingDeletes(key, ids);
    markKeyDirty(key);
    triggerSyncEvent();

    if (isQuotaCooldownActive() || ids.length === 0) return;

    try {
      const ops = ids.map(id => ({ type: 'delete' as const, ref: doc(firestore, key, id) }));
      await commitBatchedOperations(ops);
      const snap = lastCloudSnapshots.get(key);
      if (snap) ids.forEach(id => snap.delete(String(id)));
      removePendingDeletes(key, ids);
      clearKeyDirty(key);
      setLastCloudSyncTs(key, Date.now());
    } catch (e) {
      if (!tripQuotaCooldown(e)) {
        console.error("Firebase Bulk Delete Error", e);
      }
    }
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
      await this.flush();
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  },

  async log(userId: string, userName: string, action: string): Promise<void> {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      userName,
      action,
      timestamp: new Date().toISOString()
    };

    const existing = safeParseLocal<ActivityLog[]>(localStorage.getItem(DB_KEYS.LOGS), []);
    const updatedLogs = [newLog, ...existing].slice(0, 500);
    localStorage.setItem(DB_KEYS.LOGS, JSON.stringify(updatedLogs));
    triggerSyncEvent();

    if (isQuotaCooldownActive()) return;

    try {
      await setDoc(doc(firestore, DB_KEYS.LOGS, newLog.id), sanitizeForFirestore(newLog));
    } catch (e) {
      if (!tripQuotaCooldown(e)) {
        console.warn('Firebase Log Warning:', e);
      }
    }
  }
};
