const DB_NAME = 'astro-vysio-media-db';
const DB_VERSION = 1;
const STORE_NAME = 'media_store';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening media DB');
        };
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
    return dbPromise;
};

export const saveMedia = async (files: File[]): Promise<void> => {
    try {
        const db = await getDb();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put({ id: 'visuals', files });
    } catch (error) {
        console.error("Failed to save media to IndexedDB:", error);
    }
};

export const saveAudio = async (file: File): Promise<void> => {
    try {
        const db = await getDb();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put({ id: 'audio', file });
    } catch (error) {
        console.error("Failed to save audio to IndexedDB:", error);
    }
};

export const loadMedia = async (): Promise<File[]> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('visuals');
        request.onsuccess = () => resolve(request.result?.files || []);
        request.onerror = () => reject(request.error);
    });
};

export const loadAudio = async (): Promise<File | null> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('audio');
        request.onsuccess = () => resolve(request.result?.file || null);
        request.onerror = () => reject(request.error);
    });
};

export const clearMedia = async (): Promise<void> => {
    try {
        const db = await getDb();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete('visuals');
    } catch (error) {
        console.error("Failed to clear media from IndexedDB:", error);
    }
};

export const clearAudio = async (): Promise<void> => {
    try {
        const db = await getDb();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete('audio');
    } catch (error) {
        console.error("Failed to clear audio from IndexedDB:", error);
    }
};
