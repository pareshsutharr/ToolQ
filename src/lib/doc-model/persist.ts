// Local draft persistence for autosave + crash recovery (Step 14). Everything
// stays in the browser (IndexedDB), consistent with ToolQ's "files never leave
// your machine" model; server-side draft buffering belongs to the later
// premium-sync phase. A single "current draft" slot is kept so a reload can
// offer to restore the last document the user was editing.

import { DRAFTS_STORE, withStore } from "./idb";
import { migrateToLatest } from "./validate";
import type { DocumentModel } from "./types";

const DRAFT_KEY = "current";

export interface StoredDraft {
  documentId: string;
  name: string;
  model: DocumentModel;
  savedAt: string;
}

export async function saveDraft(model: DocumentModel): Promise<void> {
  const draft: StoredDraft = {
    documentId: model.documentId,
    name: model.name,
    model,
    savedAt: new Date().toISOString(),
  };
  await withStore(DRAFTS_STORE, "readwrite", (store) => store.put(draft, DRAFT_KEY));
}

/**
 * Loads the last saved draft, migrating it to the current schema. Returns null
 * if there is none or if it is too damaged/old to migrate — a corrupt draft
 * must never crash the editor on open.
 */
export async function loadDraft(): Promise<StoredDraft | null> {
  try {
    const raw = await withStore<StoredDraft | undefined>(DRAFTS_STORE, "readonly", (store) =>
      store.get(DRAFT_KEY),
    );
    if (!raw) return null;
    const model = migrateToLatest(raw.model);
    if (!model) return null;
    return { ...raw, model };
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await withStore(DRAFTS_STORE, "readwrite", (store) => store.delete(DRAFT_KEY));
  } catch {
    // A failed clear is non-fatal: the stale draft is simply offered again.
  }
}
