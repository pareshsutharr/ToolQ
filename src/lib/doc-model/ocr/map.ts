// Converts a provider-neutral OcrPageResult into document-model blocks. Kept
// separate from any provider so swapping the OCR engine never touches this
// mapping. Coordinates are scaled from the recognized image's pixel space into
// the page's point space using the ratio of the two, which recovers the render
// scale without needing to know it.

import { createParagraphBlock } from "../factory";
import type { Block, PageSize } from "../types";
import type { OcrLine, OcrPageResult } from "./provider";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// Tesseract reports geometry per line/word but not a font size; estimate one
// from the median line height so exports and the editor render at a sane size.
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function estimateFontSize(lines: OcrLine[], sy: number): number | undefined {
  const heights = lines.map((l) => (l.bbox.y1 - l.bbox.y0) * sy).filter((h) => h > 0);
  if (heights.length === 0) return undefined;
  const lineHeight = median(heights);
  return Math.round(Math.min(48, Math.max(8, lineHeight * 0.85)) * 10) / 10;
}

function allLines(result: OcrPageResult): OcrLine[] {
  return result.paragraphs
    .flatMap((p) => p.lines)
    .filter((line) => line.text.trim())
    .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
}

function lineGap(a: OcrLine, b: OcrLine): number {
  return b.bbox.y0 - a.bbox.y1;
}

function shouldJoin(prev: OcrLine, next: OcrLine, typicalHeight: number): boolean {
  const gap = lineGap(prev, next);
  if (gap < -typicalHeight * 0.35) return false;
  if (gap > typicalHeight * 0.85) return false;

  const xDelta = Math.abs(prev.bbox.x0 - next.bbox.x0);
  const prevWidth = Math.max(1, prev.bbox.x1 - prev.bbox.x0);
  const nextStartsIndented = next.bbox.x0 - prev.bbox.x0 > typicalHeight * 1.8;
  const prevLooksComplete = /[.:;!?)]$/.test(prev.text.trim());

  if (nextStartsIndented) return false;
  if (prevLooksComplete && xDelta > typicalHeight * 0.8) return false;
  return xDelta < Math.max(typicalHeight * 2.2, prevWidth * 0.22);
}

function clusterLines(lines: OcrLine[]): OcrLine[][] {
  if (lines.length === 0) return [];
  const heights = lines.map((l) => l.bbox.y1 - l.bbox.y0).filter((h) => h > 0);
  const typicalHeight = median(heights) || 16;
  const clusters: OcrLine[][] = [[lines[0]]];
  for (let i = 1; i < lines.length; i += 1) {
    const prev = lines[i - 1];
    const next = lines[i];
    if (shouldJoin(prev, next, typicalHeight)) clusters[clusters.length - 1].push(next);
    else clusters.push([next]);
  }
  return clusters;
}

function textForCluster(lines: OcrLine[]): string {
  return lines
    .map((line) => line.text.trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeText(text: string): string {
  return text
    .replace(/[«‹]/g, "•")
    .replace(/^[*+]\s+/gm, "• ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function looksLikeHeading(text: string, fontSize?: number): boolean {
  const oneLine = !text.includes("\n");
  const clean = text.replace(/[^\p{L}\p{N} ]/gu, "").trim();
  if (!oneLine || clean.length < 4 || clean.length > 130) return false;
  const letters = clean.replace(/[^A-Za-z]/g, "");
  const upperRatio = letters ? letters.replace(/[^A-Z]/g, "").length / letters.length : 0;
  return upperRatio > 0.72 || /^([A-Z]\.|ANNEXURE|INVESTOR|DETAILS OF|VISION AND)/i.test(clean) || (fontSize ?? 0) >= 15;
}

function bboxForLines(lines: OcrLine[]) {
  return {
    x0: Math.min(...lines.map((l) => l.bbox.x0)),
    y0: Math.min(...lines.map((l) => l.bbox.y0)),
    x1: Math.max(...lines.map((l) => l.bbox.x1)),
    y1: Math.max(...lines.map((l) => l.bbox.y1)),
  };
}

function confidenceForLines(lines: OcrLine[]): number {
  const confidences = lines.map((l) => l.confidence).filter((n) => Number.isFinite(n));
  return confidences.length ? confidences.reduce((sum, n) => sum + n, 0) / confidences.length : 0;
}

export function ocrResultToBlocks(result: OcrPageResult, pageSize: PageSize): Block[] {
  if (result.width <= 0 || result.height <= 0) return [];
  const sx = pageSize.widthPt / result.width;
  const sy = pageSize.heightPt / result.height;

  const blocks: Block[] = [];
  for (const lines of clusterLines(allLines(result))) {
    const text = normalizeText(textForCluster(lines));
    if (!text) continue;
    const bbox = bboxForLines(lines);
    const fontSize = estimateFontSize(lines, sy);
    const block = createParagraphBlock({
      text,
      position: { x: bbox.x0 * sx, y: bbox.y0 * sy },
      dimensions: {
        width: (bbox.x1 - bbox.x0) * sx,
        height: (bbox.y1 - bbox.y0) * sy,
      },
      fontSize,
      source: "ocr",
      ocrConfidence: clamp01(confidenceForLines(lines)),
    });
    if (looksLikeHeading(text, fontSize)) {
      block.type = "heading";
      block.styles.fontWeight = 700;
      block.content = { kind: "heading", text, level: 2 };
    }
    blocks.push(
      block,
    );
  }
  return blocks;
}
