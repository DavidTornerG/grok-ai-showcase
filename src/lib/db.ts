export const DB_NAME = 'grok-files-db';
export const STORE_NAME = 'files';

// Open (or create) the IndexedDB database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putFileBlob(id: string, blob: Blob) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(blob, id);
  await tx.complete?.catch(() => {});
  db.close();
}

export async function getFileBlob(id: string): Promise<Blob | undefined> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const req = tx.objectStore(STORE_NAME).get(id);
  return new Promise((resolve) => {
    req.onsuccess = () => {
      db.close();
      resolve(req.result as Blob | undefined);
    };
    req.onerror = () => {
      db.close();
      resolve(undefined);
    };
  });
}

export async function deleteFileBlob(id: string) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await tx.complete?.catch(() => {});
  db.close();
}
