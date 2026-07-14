// Internal Document Model — the single source of truth for the document
// editor (spec §Step 6). The editor never mutates the uploaded file; it only
// ever reads and writes this JSON. Every input format (PDF, DOCX, image) is
// normalized into this shape so the editor and exporters are format-agnostic.
//
// The schema is versioned via DOCUMENT_MODEL_VERSION and migrated forward by
// `migrateToLatest` (see ./validate) so stored drafts survive schema changes.

/** Bump whenever the persisted shape changes; add a step to `migrateToLatest`. */
export const DOCUMENT_MODEL_VERSION = 1;

export type SupportedFileType = "pdf" | "docx" | "png" | "jpg" | "jpeg";

/**
 * Block kinds. Phase 1 produces and edits `paragraph`/`heading`; the remaining
 * kinds are part of the canonical schema so the model is complete and forward-
 * compatible, and are rendered read-only until their editors land (Steps 8-10).
 */
export type BlockType =
  | "paragraph"
  | "heading"
  | "list"
  | "table"
  | "image"
  | "header"
  | "footer"
  | "signature"
  | "form_field";

/** Where a block came from — drives the OCR-confidence review affordance (Step 20). */
export type BlockSource = "digital" | "ocr";

export type Alignment = "left" | "right" | "center" | "justify";

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Page dimensions in PostScript points (1pt = 1/72 inch), matching PDF units. */
export interface PageSize {
  widthPt: number;
  heightPt: number;
}

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface BlockStyles {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  highlight?: string;
  alignment?: Alignment;
}

export interface BlockMetadata {
  source: BlockSource;
  /** 0..1 confidence from the OCR provider; only meaningful when source === "ocr". */
  ocrConfidence?: number;
  createdAt: string;
  /** Set when the user changes this block, so layout mode can paint over the source page. */
  updatedAt?: string;
}

export interface TextContent {
  kind: "text";
  text: string;
}

export interface HeadingContent {
  kind: "heading";
  text: string;
  level: number;
}

export interface ListContent {
  kind: "list";
  ordered: boolean;
  items: string[];
}

export interface TableContent {
  kind: "table";
  rows: string[][];
}

export interface ImageContent {
  kind: "image";
  /** Data URL of a working copy; the source asset is never overwritten (Step 9). */
  dataUrl: string;
  caption?: string;
}

export interface SignatureContent {
  kind: "signature";
  dataUrl?: string;
}

export type BlockContent =
  | TextContent
  | HeadingContent
  | ListContent
  | TableContent
  | ImageContent
  | SignatureContent;

/**
 * A positioned, styled unit of content. `sectionId` is a stable id that
 * survives reflow so comments, autosave diffs, and future collaboration can
 * anchor to it (Steps 8, 14, 16). `position`/`dimensions` preserve source
 * coordinates for fidelity even though Phase 1 renders blocks in flow.
 */
export interface Block {
  sectionId: string;
  type: BlockType;
  position: Point;
  dimensions: Size;
  styles: BlockStyles;
  content: BlockContent;
  metadata: BlockMetadata;
}

export interface Page {
  pageId: string;
  pageNumber: number;
  size: PageSize;
  margins: Margins;
  /** Rendered source-page image used as a visual reference in layout mode. */
  backgroundDataUrl?: string;
  sections: Block[];
}

/** A comment thread anchored to a block id, not coordinates, so it survives reflow. */
export interface Annotation {
  threadId: string;
  blockId: string;
  authorId: string;
  body: string;
  mentions: string[];
  resolved: boolean;
  createdAt: string;
}

export interface DocumentModel {
  /** Schema version; distinct from `version`, the user-facing content revision. */
  documentModelVersion: number;
  documentId: string;
  version: number;
  name: string;
  sourceFileType: SupportedFileType;
  pages: Page[];
  annotations: Annotation[];
  createdAt: string;
  updatedAt: string;
}

/** True for block kinds whose text the Phase 1 editor can edit inline. */
export function isEditableText(block: Block): boolean {
  return block.type === "paragraph" || block.type === "heading";
}

/** Reads the plain-text payload of any block, for search/export/metadata. */
export function blockText(block: Block): string {
  const c = block.content;
  switch (c.kind) {
    case "text":
    case "heading":
      return c.text;
    case "list":
      return c.items.join("\n");
    case "table":
      return c.rows.map((r) => r.join("\t")).join("\n");
    case "image":
      return c.caption ?? "";
    case "signature":
      return "";
  }
}
