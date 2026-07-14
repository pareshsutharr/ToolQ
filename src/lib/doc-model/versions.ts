// Version history (Step 15). Each version is an append-only, full snapshot of
// the document model, stored in IndexedDB keyed by its own id and indexed by
// documentId. Snapshots are cloned on the way in so later edits to the working
// model never mutate stored history.
//
// Retention (Step 15): every version from the last 30 days is kept; older ones
// are thinned to the latest per calendar day. The newest version is always
// kept regardless of age.

import { createId } from "./factory";
import { VERSIONS_STORE, withStore } from "./idb";
import { blockText, type DocumentModel } from "./types";

const RETENTION_FULL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  label: string;
  createdAt: string;
  createdBy: string;
  model: DocumentModel;
}

export type VersionSummary = Omit<DocumentVersion, "model">;

function toSummary(record: DocumentVersion): VersionSummary {
  const { model: _model, ...summary } = record;
  void _model;
  return summary;
}

async function allForDocument(documentId: string): Promise<DocumentVersion[]> {
  try {
    return await withStore<DocumentVersion[]>(VERSIONS_STORE, "readonly", (store) =>
      store.index("documentId").getAll(documentId),
    );
  } catch {
    return [];
  }
}

export async function listVersions(documentId: string): Promise<VersionSummary[]> {
  const all = await allForDocument(documentId);
  return all.map(toSummary).sort((a, b) => b.versionNumber - a.versionNumber);
}

export async function getVersion(id: string): Promise<DocumentVersion | null> {
  try {
    const record = await withStore<DocumentVersion | undefined>(VERSIONS_STORE, "readonly", (store) =>
      store.get(id),
    );
    return record ?? null;
  } catch {
    return null;
  }
}

export async function createVersion(
  model: DocumentModel,
  label?: string,
  createdBy = "You",
): Promise<VersionSummary> {
  const existing = await allForDocument(model.documentId);
  const versionNumber = existing.reduce((max, v) => Math.max(max, v.versionNumber), 0) + 1;
  const record: DocumentVersion = {
    id: createId(),
    documentId: model.documentId,
    versionNumber,
    label: label?.trim() || `Version ${versionNumber}`,
    createdAt: new Date().toISOString(),
    createdBy,
    model: structuredClone(model),
  };
  await withStore(VERSIONS_STORE, "readwrite", (store) => store.put(record));
  await pruneVersions(model.documentId);
  return toSummary(record);
}

/** Creates the first snapshot only if the document has no history yet. */
export async function ensureInitialVersion(
  model: DocumentModel,
  label = "Imported",
): Promise<VersionSummary[]> {
  const existing = await listVersions(model.documentId);
  if (existing.length > 0) return existing;
  await createVersion(model, label);
  return listVersions(model.documentId);
}

export async function renameVersion(id: string, label: string): Promise<void> {
  const record = await getVersion(id);
  if (!record) return;
  record.label = label.trim() || record.label;
  await withStore(VERSIONS_STORE, "readwrite", (store) => store.put(record));
}

export async function deleteVersion(id: string): Promise<void> {
  await withStore(VERSIONS_STORE, "readwrite", (store) => store.delete(id));
}

export async function duplicateVersion(id: string): Promise<VersionSummary | null> {
  const record = await getVersion(id);
  if (!record) return null;
  return createVersion(record.model, `Copy of ${record.label}`, record.createdBy);
}

export async function pruneVersions(documentId: string): Promise<void> {
  const summaries = (await listVersions(documentId)).sort(
    (a, b) => a.versionNumber - b.versionNumber,
  );
  if (summaries.length <= 1) return;

  const cutoff = Date.now() - RETENTION_FULL_DAYS * DAY_MS;
  const keep = new Set<string>();
  keep.add(summaries[summaries.length - 1].id); // newest is always kept

  const latestPerDay = new Map<string, VersionSummary>();
  for (const v of summaries) {
    if (Date.parse(v.createdAt) >= cutoff) {
      keep.add(v.id);
      continue;
    }
    const day = v.createdAt.slice(0, 10);
    const current = latestPerDay.get(day);
    if (!current || Date.parse(v.createdAt) > Date.parse(current.createdAt)) {
      latestPerDay.set(day, v);
    }
  }
  for (const v of latestPerDay.values()) keep.add(v.id);

  for (const v of summaries) {
    if (!keep.has(v.id)) await deleteVersion(v.id);
  }
}

/** Flattens a model to plain text for the version-compare diff view. */
export function modelToPlainText(model: DocumentModel): string {
  return model.pages
    .map((page) => {
      const heading = `— Page ${page.pageNumber} —`;
      const body = page.sections
        .map(blockText)
        .filter((t) => t.trim())
        .join("\n");
      return `${heading}\n${body}`;
    })
    .join("\n\n");
}
