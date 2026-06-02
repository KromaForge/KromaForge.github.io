/**
 * KromaForge - IndexedDB Persistence Controller
 * Manages storing and retrieving image Blobs in client-side storage.
 */
const DB_NAME = 'KromaForgeDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let dbInstance = null;

function dbInit() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (e) => {
            dbInstance = e.target.result;
            resolve(dbInstance);
        };

        request.onerror = (e) => {
            console.error('IndexedDB open error:', e.target.error);
            reject(e.target.error);
        };
    });
}

function getVal(key) {
    return dbInit().then((db) => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    });
}

function setVal(key, val) {
    return dbInit().then((db) => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(val, key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

function deleteVal(key) {
    return dbInit().then((db) => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

// Public API
window.KromaDB = {
    getActiveImage: () => getVal('active_image'),
    setActiveImage: (blob) => setVal('active_image', blob),
    getFilename: () => getVal('filename').then(name => name || 'kromaforge_edit.png'),
    setFilename: (name) => setVal('filename', name),
    getOriginalImage: () => getVal('original_image'),
    setOriginalImage: (blob) => setVal('original_image', blob),
    clearAll: () => {
        return dbInit().then((db) => {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });
    }
};
