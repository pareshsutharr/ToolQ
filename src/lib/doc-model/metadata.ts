// Derived document metadata (Step 19): word/character/page counts and the
// low-confidence OCR review queue (Step 20).

import { blockText, type Block, type DocumentModel } from "./types";

/** Blocks below this OCR confidence are flagged for manual review (Step 20). */
export const LOW_CONFIDENCE_THRESHOLD = 0.75;

export interface DocumentStats {
  pageCount: number;
  wordCount: number;
  charCount: number;
  lowConfidenceBlocks: number;
  scannedPages: number;
}

export function computeStats(model: DocumentModel): DocumentStats {
  let wordCount = 0;
  let charCount = 0;
  let lowConfidenceBlocks = 0;
  const scannedPageIds = new Set<string>();

  for (const page of model.pages) {
    for (const block of page.sections) {
      const text = blockText(block);
      charCount += text.length;
      const words = text.trim().split(/\s+/).filter(Boolean);
      wordCount += words.length;
      if (isLowConfidence(block)) {
        lowConfidenceBlocks += 1;
        scannedPageIds.add(page.pageId);
      }
    }
  }

  return {
    pageCount: model.pages.length,
    wordCount,
    charCount,
    lowConfidenceBlocks,
    scannedPages: scannedPageIds.size,
  };
}

export function isLowConfidence(block: Block): boolean {
  return (
    block.metadata.source === "ocr" &&
    (block.metadata.ocrConfidence ?? 0) < LOW_CONFIDENCE_THRESHOLD
  );
}
