// Runtime validation and forward-migration for the document model.
//
// The spec (Step 6) requires that every persisted object carry a unique id,
// position, dimensions, styles, and metadata, enforced "at write time". We do
// that here with a dependency-free structural validator rather than pulling in
// a schema library, so autosave/restore can reject corrupt drafts and callers
// get a precise list of what is wrong.

import {
  DOCUMENT_MODEL_VERSION,
  type Block,
  type DocumentModel,
  type Page,
} from "./types";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "list",
  "table",
  "image",
  "header",
  "footer",
  "signature",
  "form_field",
]);

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isStr(v: unknown): v is string {
  return typeof v === "string";
}

function validatePoint(v: unknown, path: string, errors: string[]) {
  if (!isObj(v) || !isNum(v.x) || !isNum(v.y)) errors.push(`${path}: expected { x, y } numbers`);
}

function validateSize(v: unknown, path: string, errors: string[]) {
  if (!isObj(v) || !isNum(v.width) || !isNum(v.height))
    errors.push(`${path}: expected { width, height } numbers`);
}

function validateBlock(block: unknown, path: string, seenIds: Set<string>, errors: string[]) {
  if (!isObj(block)) {
    errors.push(`${path}: not an object`);
    return;
  }
  if (!isStr(block.sectionId) || !block.sectionId) {
    errors.push(`${path}.sectionId: missing`);
  } else if (seenIds.has(block.sectionId)) {
    errors.push(`${path}.sectionId: duplicate id "${block.sectionId}"`);
  } else {
    seenIds.add(block.sectionId);
  }

  if (!isStr(block.type) || !BLOCK_TYPES.has(block.type)) {
    errors.push(`${path}.type: invalid block type`);
  }

  validatePoint(block.position, `${path}.position`, errors);
  validateSize(block.dimensions, `${path}.dimensions`, errors);

  if (!isObj(block.styles)) errors.push(`${path}.styles: missing`);
  if (!isObj(block.content) || !isStr((block.content as Record<string, unknown>).kind)) {
    errors.push(`${path}.content: missing typed payload`);
  }

  const meta = block.metadata;
  if (!isObj(meta)) {
    errors.push(`${path}.metadata: missing`);
  } else {
    if (meta.source !== "digital" && meta.source !== "ocr") {
      errors.push(`${path}.metadata.source: must be "digital" or "ocr"`);
    }
    if (meta.ocrConfidence !== undefined) {
      if (!isNum(meta.ocrConfidence) || meta.ocrConfidence < 0 || meta.ocrConfidence > 1) {
        errors.push(`${path}.metadata.ocrConfidence: must be between 0 and 1`);
      }
    }
    if (!isStr(meta.createdAt)) errors.push(`${path}.metadata.createdAt: missing`);
  }
}

function validatePage(page: unknown, path: string, seenIds: Set<string>, errors: string[]) {
  if (!isObj(page)) {
    errors.push(`${path}: not an object`);
    return;
  }
  if (!isStr(page.pageId) || !page.pageId) errors.push(`${path}.pageId: missing`);
  else if (seenIds.has(page.pageId)) errors.push(`${path}.pageId: duplicate id "${page.pageId}"`);
  else seenIds.add(page.pageId);

  if (!isNum(page.pageNumber)) errors.push(`${path}.pageNumber: missing`);
  if (!isObj(page.size) || !isNum(page.size.widthPt) || !isNum(page.size.heightPt)) {
    errors.push(`${path}.size: expected { widthPt, heightPt }`);
  }
  if (!Array.isArray(page.sections)) {
    errors.push(`${path}.sections: expected array`);
    return;
  }
  page.sections.forEach((b, i) => validateBlock(b, `${path}.sections[${i}]`, seenIds, errors));
}

/** Structural validation. Returns every problem found, not just the first. */
export function validateDocumentModel(model: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObj(model)) return { ok: false, errors: ["document: not an object"] };

  if (model.documentModelVersion !== DOCUMENT_MODEL_VERSION) {
    errors.push(
      `documentModelVersion: expected ${DOCUMENT_MODEL_VERSION}, got ${String(model.documentModelVersion)}`,
    );
  }
  if (!isStr(model.documentId) || !model.documentId) errors.push("documentId: missing");
  if (!isNum(model.version)) errors.push("version: missing");
  if (!isStr(model.name)) errors.push("name: missing");

  if (!Array.isArray(model.pages)) {
    errors.push("pages: expected array");
  } else {
    // Ids must be unique across the whole document, not just within a page, so
    // block references (comments, autosave diffs) are globally unambiguous.
    const seenIds = new Set<string>();
    model.pages.forEach((p, i) => validatePage(p, `pages[${i}]`, seenIds, errors));
  }

  return { ok: errors.length === 0, errors };
}

/** Throws with a readable message; use at write time (autosave, export). */
export function assertValidDocumentModel(model: unknown): asserts model is DocumentModel {
  const { ok, errors } = validateDocumentModel(model);
  if (!ok) {
    throw new Error(`Invalid document model:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Brings a persisted model up to the current schema version. Today only
 * version 1 exists, so this validates and passes through; the switch is the
 * seam where future `documentModelVersion` bumps add their migration step.
 * Returns null if the input is too damaged or too new to migrate.
 */
export function migrateToLatest(raw: unknown): DocumentModel | null {
  if (!isObj(raw)) return null;
  const version = raw.documentModelVersion;

  switch (version) {
    case DOCUMENT_MODEL_VERSION: {
      const result = validateDocumentModel(raw);
      return result.ok ? (raw as unknown as DocumentModel) : null;
    }
    default:
      // Older versions get their migration step added here as the schema
      // evolves; unknown/newer versions cannot be safely opened.
      return null;
  }
}

/** Convenience view over a page's blocks (unused ids stripped) for exporters. */
export function eachBlock(model: DocumentModel, fn: (block: Block, page: Page) => void) {
  for (const page of model.pages) {
    for (const block of page.sections) fn(block, page);
  }
}
