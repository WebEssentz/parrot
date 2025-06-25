// IndexedDB utility for Avurna AI descriptions (persistent cache)
// Provides a promise-based API for storing and retrieving AI descriptions

const DESC_DB_NAME = 'avurna-desc-db';
const DESC_DB_VERSION = 1;
const DESC_STORE_NAME = 'descriptions';

export interface StoredDescription {
  key: string; // unique key (e.g., URL or message ID)
  description: string;
  addedAt: number;
}

function openDescDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DESC_DB_NAME, DESC_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DESC_STORE_NAME)) {
        db.createObjectStore(DESC_STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDescriptionToIDB(key: string, description: string): Promise<void> {
  const db = await openDescDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DESC_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DESC_STORE_NAME);
    const now = Date.now();
    store.put({ key, description, addedAt: now });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDescriptionFromIDB(key: string): Promise<string | undefined> {
  const db = await openDescDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DESC_STORE_NAME, 'readonly');
    const store = tx.objectStore(DESC_STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.description : undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllDescriptions(): Promise<void> {
  const db = await openDescDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DESC_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DESC_STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
