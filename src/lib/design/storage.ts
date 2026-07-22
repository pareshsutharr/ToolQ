// IndexedDB persistence for Design Space projects. Designs embed uploaded
// images as data URLs, which overflow localStorage quickly — IndexedDB has
// no practical size limit for this use case. Mirrors the doc-model/idb
// pattern used by the PDF editor.

import { migrateDesign, type DesignDoc } from "./types";

const DB_NAME = "toolq-design-space";
const DB_VERSION = 1;
const STORE = "designs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export function saveDesign(doc: DesignDoc): Promise<IDBValidKey> {
  return withStore("readwrite", (store) => store.put(doc));
}

export function getDesign(id: string): Promise<DesignDoc | undefined> {
  return withStore<DesignDoc | undefined>("readonly", (store) => store.get(id)).then((doc) =>
    doc ? migrateDesign(doc) : undefined,
  );
}

export function listDesigns(): Promise<DesignDoc[]> {
  return withStore<DesignDoc[]>("readonly", (store) => store.getAll()).then((docs) =>
    docs.map(migrateDesign).sort((a, b) => b.updatedAt - a.updatedAt),
  );
}

export function deleteDesign(id: string): Promise<undefined> {
  return withStore("readwrite", (store) => store.delete(id));
}
