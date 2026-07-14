// Orchestrates OCR over the scanned pages of an already-imported document.
// Processes pages one at a time so progress can stream (Step 22). A page that
// fails or yields no text is reported back as needing manual review (Step 21)
// without discarding the page background or corrupting already-good pages.

import { renderPageToCanvas } from "@/lib/pdfjs";
import "./builtins"; // ensure the default provider is registered before we resolve it
import { getOcrProviderFactory } from "./provider";
import { ocrResultToBlocks } from "./map";
import { detectVisualBlocks } from "./visual";
import type { DocumentModel } from "../types";

const DEFAULT_RENDER_SCALE = 2.5;

export interface OcrRunProgress {
  /** 1-based index within the scanned-page set being processed. */
  page: number;
  total: number;
  phase: "rendering" | "recognizing";
}

export interface OcrRunResult {
  ocredPages: number[];
  /** Pages that errored or produced no text — still need manual review. */
  failedPages: number[];
}

export interface OcrRunParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any;
  model: DocumentModel;
  /** 1-based page numbers to OCR (typically the scanned pages from import). */
  scannedPageNumbers: number[];
  providerId?: string;
  renderScale?: number;
  onProgress?: (p: OcrRunProgress) => void;
}

export async function runOcrOnScannedPages(params: OcrRunParams): Promise<OcrRunResult> {
  const { pdf, model, scannedPageNumbers, providerId, onProgress } = params;
  const renderScale = params.renderScale ?? DEFAULT_RENDER_SCALE;
  const total = scannedPageNumbers.length;

  const provider = await getOcrProviderFactory(providerId).create();
  const ocredPages: number[] = [];
  const failedPages: number[] = [];

  try {
    let index = 0;
    for (const pageNumber of scannedPageNumbers) {
      index += 1;
      const page = model.pages.find((p) => p.pageNumber === pageNumber);
      if (!page) {
        failedPages.push(pageNumber);
        continue;
      }
      try {
        onProgress?.({ page: index, total, phase: "rendering" });
        const canvas = await renderPageToCanvas(pdf, pageNumber, renderScale);
        onProgress?.({ page: index, total, phase: "recognizing" });
        const result = await provider.recognize(canvas);
        const blocks = ocrResultToBlocks(result, page.size);
        if (blocks.length > 0) {
          page.sections = [...blocks, ...detectVisualBlocks(canvas, blocks, page.size)];
          ocredPages.push(pageNumber);
        } else {
          page.sections = detectVisualBlocks(canvas, [], page.size);
          failedPages.push(pageNumber);
        }
      } catch {
        page.sections = [];
        failedPages.push(pageNumber);
      }
    }
  } finally {
    await provider.dispose();
  }

  return { ocredPages, failedPages };
}
