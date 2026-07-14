// Shared IndexedDB access for the document editor. Both the autosave draft
// (./persist) and the version history (./versions) live in one database so
// there is a single schema/upgrade path. Bumping DB_VERSION runs the upgrade,
// which creates any missing stores without touching existing data.

const DB_NAME = "toolq-doc-editor";
const DB_VERSION = 2;

export const DRAFTS_STORE = "drafts";
export const VERSIONS_STORE = "versions";

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.createObjectStore(DRAFTS_STORE);
      }
      if (!db.objectStoreNames.contains(VERSIONS_STORE)) {
        const store = db.createObjectStore(VERSIONS_STORE, { keyPath: "id" });
        store.createIndex("documentId", "documentId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Runs a single request inside a transaction and resolves with its result. */
export function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = run(tx.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}
