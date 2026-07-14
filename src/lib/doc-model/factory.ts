// Constructors for document-model objects. Centralising id generation here is
// what guarantees the "stable block ids" the spec asks for (Steps 8, 16, §8)
// so comments, autosave diffs, and future collaboration have something durable
// to anchor to.

import {
  DOCUMENT_MODEL_VERSION,
  type Alignment,
  type Block,
  type BlockSource,
  type DocumentModel,
  type Page,
  type PageSize,
  type SupportedFileType,
} from "./types";

/** US Letter in points — the default when a source page size is unknown. */
export const DEFAULT_PAGE_SIZE: PageSize = { widthPt: 612, heightPt: 792 };
export const DEFAULT_MARGIN_PT = 72;

export function createId(): string {
  // crypto.randomUUID is available in every browser we target and in the Node
  // runtime used for tests; no polyfill needed.
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface CreateParagraphOptions {
  text: string;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
  fontSize?: number;
  fontFamily?: string;
  alignment?: Alignment;
  source?: BlockSource;
  ocrConfidence?: number;
}

export function createParagraphBlock(opts: CreateParagraphOptions): Block {
  const source = opts.source ?? "digital";
  return {
    sectionId: createId(),
    type: "paragraph",
    position: opts.position ?? { x: 0, y: 0 },
    dimensions: opts.dimensions ?? { width: 0, height: 0 },
    styles: {
      fontFamily: opts.fontFamily,
      fontSize: opts.fontSize,
      alignment: opts.alignment ?? "left",
    },
    content: { kind: "text", text: opts.text },
    metadata: {
      source,
      ocrConfidence: source === "ocr" ? (opts.ocrConfidence ?? 0) : undefined,
      createdAt: nowIso(),
    },
  };
}

export function createHeadingBlock(text: string, level: number, fontSize?: number): Block {
  return {
    sectionId: createId(),
    type: "heading",
    position: { x: 0, y: 0 },
    dimensions: { width: 0, height: 0 },
    styles: { fontSize, fontWeight: 700, alignment: "left" },
    content: { kind: "heading", text, level },
    metadata: { source: "digital", createdAt: nowIso() },
  };
}

export function createEmptyParagraph(): Block {
  return createParagraphBlock({ text: "" });
}

export function createTableBlock(rows: string[][]): Block {
  return {
    sectionId: createId(),
    type: "table",
    position: { x: 0, y: 0 },
    dimensions: { width: 0, height: 0 },
    styles: { fontSize: 12, alignment: "left" },
    content: { kind: "table", rows },
    metadata: { source: "digital", createdAt: nowIso() },
  };
}

/** A blank grid of the given size (defaults to 2×2), all cells empty. */
export function createEmptyTableBlock(rowCount = 2, colCount = 2): Block {
  const rows = Array.from({ length: Math.max(1, rowCount) }, () =>
    Array.from({ length: Math.max(1, colCount) }, () => ""),
  );
  return createTableBlock(rows);
}

export interface CreateImageOptions {
  width?: number;
  height?: number;
  caption?: string;
}

export function createImageBlock(dataUrl: string, opts: CreateImageOptions = {}): Block {
  return {
    sectionId: createId(),
    type: "image",
    position: { x: 0, y: 0 },
    dimensions: { width: opts.width ?? 320, height: opts.height ?? 0 },
    styles: { alignment: "left" },
    content: { kind: "image", dataUrl, caption: opts.caption },
    metadata: { source: "digital", createdAt: nowIso() },
  };
}

export function createSignatureBlock(dataUrl: string, width = 220, height = 90): Block {
  return {
    sectionId: createId(),
    type: "signature",
    position: { x: 0, y: 0 },
    dimensions: { width, height },
    styles: {},
    content: { kind: "signature", dataUrl },
    metadata: { source: "digital", createdAt: nowIso() },
  };
}

export function createPage(pageNumber: number, size: PageSize = DEFAULT_PAGE_SIZE): Page {
  return {
    pageId: createId(),
    pageNumber,
    size,
    margins: {
      top: DEFAULT_MARGIN_PT,
      bottom: DEFAULT_MARGIN_PT,
      left: DEFAULT_MARGIN_PT,
      right: DEFAULT_MARGIN_PT,
    },
    sections: [],
  };
}

export function createEmptyDocument(name: string, sourceFileType: SupportedFileType): DocumentModel {
  const ts = nowIso();
  return {
    documentModelVersion: DOCUMENT_MODEL_VERSION,
    documentId: createId(),
    version: 1,
    name,
    sourceFileType,
    pages: [],
    annotations: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Renumbers pages 1..n so pagination stays in sync after add/remove (Step 11). */
export function renumberPages(model: DocumentModel): void {
  model.pages.forEach((page, i) => {
    page.pageNumber = i + 1;
  });
}

/** Stamps a new content revision + timestamp; call on every persisted edit. */
export function bumpRevision(model: DocumentModel): void {
  model.version += 1;
  model.updatedAt = nowIso();
}
