// PDF → document model. Classification runs per page (Step 2): pages with a
// real extractable text layer are parsed into positioned paragraph blocks
// (Step 3); pages that are effectively scanned images are flagged for the OCR
// pipeline (a later phase) rather than being OCR'd here, and never lose their
// place in the document.

import { loadPdfjs } from "@/lib/pdfjs";
import { createEmptyDocument, createParagraphBlock, createPage } from "./factory";
import type { DocumentModel, Page } from "./types";

/** Below this many extractable non-space characters, a page is treated as scanned. */
const SEARCHABLE_MIN_CHARS = 16;
/** Rows whose baselines fall within this many points are one visual line. */
const ROW_Y_TOLERANCE = 3;
/** A vertical gap wider than this multiple of the typical line gap starts a new paragraph. */
const PARAGRAPH_GAP_FACTOR = 1.6;
const BACKGROUND_RENDER_SCALE = 1.5;

interface PositionedItem {
  str: string;
  x: number;
  yBaseline: number;
  width: number;
  fontSize: number;
}

interface Line {
  text: string;
  x: number;
  yBaseline: number;
  width: number;
  fontSize: number;
}

export interface ImportProgress {
  page: number;
  total: number;
}

export interface ImportResult {
  model: DocumentModel;
  /** 1-based page numbers that were classified as scanned and need OCR. */
  scannedPages: number[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectItems(content: any): PositionedItem[] {
  const items: PositionedItem[] = [];
  for (const item of content.items ?? []) {
    if (!item || typeof item !== "object" || !("str" in item) || !("transform" in item)) continue;
    const { str, transform, width } = item as { str: string; transform: number[]; width?: number };
    if (!str.trim()) continue;
    const fontSize = Math.hypot(transform[0], transform[1]) || 12;
    items.push({ str, x: transform[4], yBaseline: transform[5], width: width ?? 0, fontSize });
  }
  return items;
}

// Group items sharing a baseline into visual lines, ordered top-to-bottom.
function groupIntoLines(items: PositionedItem[]): Line[] {
  const buckets: PositionedItem[][] = [];
  const sorted = [...items].sort((a, b) => b.yBaseline - a.yBaseline || a.x - b.x);
  for (const item of sorted) {
    const bucket = buckets.find((b) => Math.abs(b[0].yBaseline - item.yBaseline) <= ROW_Y_TOLERANCE);
    if (bucket) bucket.push(item);
    else buckets.push([item]);
  }
  return buckets.map((bucket) => {
    bucket.sort((a, b) => a.x - b.x);
    const minX = Math.min(...bucket.map((i) => i.x));
    const maxRight = Math.max(...bucket.map((i) => i.x + i.width));
    const fontSize = median(bucket.map((i) => i.fontSize));
    return {
      text: bucket.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim(),
      x: minX,
      yBaseline: bucket[0].yBaseline,
      width: maxRight - minX,
      fontSize,
    };
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Cluster consecutive lines into paragraphs by comparing each inter-line gap to
// the document's typical gap; an unusually large gap marks a paragraph break.
function clusterIntoParagraphs(lines: Line[]): Line[][] {
  if (lines.length <= 1) return lines.map((l) => [l]);
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    gaps.push(lines[i - 1].yBaseline - lines[i].yBaseline);
  }
  const typicalGap = median(gaps.filter((g) => g > 0));
  const clusters: Line[][] = [[lines[0]]];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1].yBaseline - lines[i].yBaseline;
    const isBreak = typicalGap > 0 && gap > typicalGap * PARAGRAPH_GAP_FACTOR;
    if (isBreak) clusters.push([lines[i]]);
    else clusters[clusters.length - 1].push(lines[i]);
  }
  return clusters;
}

function buildPageBlocks(page: Page, lines: Line[], pageHeightPt: number): void {
  for (const cluster of clusterIntoParagraphs(lines)) {
    const text = cluster.map((l) => l.text).join("\n");
    if (!text.trim()) continue;
    const x = Math.min(...cluster.map((l) => l.x));
    const right = Math.max(...cluster.map((l) => l.x + l.width));
    const topBaseline = Math.max(...cluster.map((l) => l.yBaseline));
    const bottomBaseline = Math.min(...cluster.map((l) => l.yBaseline));
    const fontSize = median(cluster.map((l) => l.fontSize));
    // PDF coordinates are bottom-up from the page's lower-left; convert the
    // paragraph's top edge into a top-down origin the editor/exporters expect.
    const yTop = pageHeightPt - (topBaseline + fontSize);
    page.sections.push(
      createParagraphBlock({
        text,
        position: { x, y: yTop },
        dimensions: { width: right - x, height: topBaseline - bottomBaseline + fontSize },
        fontSize: Math.round(fontSize * 10) / 10,
      }),
    );
  }
}

async function renderPageBackground(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfPage: any,
): Promise<string | undefined> {
  if (typeof document === "undefined") return undefined;
  const viewport = pdfPage.getViewport({ scale: BACKGROUND_RENDER_SCALE });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await pdfPage.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.86);
}

export async function importPdfToModel(
  file: File,
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportResult> {
  const pdfjsLib = await loadPdfjs();
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

  const model = createEmptyDocument(file.name.replace(/\.pdf$/i, ""), "pdf");
  const scannedPages: number[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    onProgress?.({ page: pageNum, total: pdf.numPages });
    const pdfPage = await pdf.getPage(pageNum);
    const viewport = pdfPage.getViewport({ scale: 1 });
    const page = createPage(pageNum, { widthPt: viewport.width, heightPt: viewport.height });
    page.backgroundDataUrl = await renderPageBackground(pdfPage);

    const content = await pdfPage.getTextContent();
    const items = collectItems(content);
    const charCount = items.reduce((sum, it) => sum + it.str.replace(/\s/g, "").length, 0);

    if (charCount >= SEARCHABLE_MIN_CHARS) {
      buildPageBlocks(page, groupIntoLines(items), viewport.height);
    } else {
      // Scanned/image page: keep the visual page background in place and let
      // the client kick off OCR automatically after import. We avoid creating a
      // fake empty text block because it pollutes the page and statistics.
      scannedPages.push(pageNum);
    }

    model.pages.push(page);
  }

  return { model, scannedPages };
}
