// IndexedDB utility for Avurna media offline support
// Provides robust, promise-based API for storing and retrieving media blobs

const DB_NAME = 'avurna-media-db';
const DB_VERSION = 1;
const STORE_NAME = 'media';

export interface StoredMediaMeta {
  key: string; // unique key (usually the media URL)
  type: 'image' | 'video';
  mimeType: string;
  size: number;
  title?: string;
  sourceUrl?: string;
  addedAt: number;
}

export interface StoredMedia {
  meta: StoredMediaMeta;
  blob: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('addedAt', 'meta.addedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMediaToIDB(key: string, blob: Blob, meta: Omit<StoredMediaMeta, 'addedAt'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();
    store.put({ key, blob, meta: { ...meta, addedAt: now } });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMediaFromIDB(key: string): Promise<StoredMedia | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as StoredMedia | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMediaFromIDB(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listAllMedia(): Promise<StoredMediaMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result as StoredMedia[]).map((item) => item.meta);
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllMedia(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
