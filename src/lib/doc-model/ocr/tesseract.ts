// Tesseract.js implementation of OcrProvider — the default, offline provider
// (spec §7 fallback, §3.2). It walks Tesseract's block→paragraph→line→word tree
// into the provider-neutral OcrPageResult and normalizes confidence from
// Tesseract's 0..100 scale to 0..1.
//
// The block tree is accessed loosely (matching the pdfjs pattern used elsewhere
// in this codebase) because tesseract.js's structured-block types are only
// present when `{ blocks: true }` is requested at recognize time.

import {
  type OcrLine,
  type OcrPageResult,
  type OcrParagraph,
  type OcrProvider,
  type OcrProviderFactory,
} from "./provider";

const DEFAULT_LANG = "eng";

function norm(confidence: unknown): number {
  const n = typeof confidence === "number" ? confidence : 0;
  return Math.max(0, Math.min(1, n / 100));
}

class TesseractProvider implements OcrProvider {
  readonly id = "tesseract";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly worker: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(worker: any) {
    this.worker = worker;
  }

  async recognize(canvas: HTMLCanvasElement): Promise<OcrPageResult> {
    const { data } = await this.worker.recognize(canvas, {}, { blocks: true });
    const paragraphs: OcrParagraph[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const block of (data.blocks ?? []) as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const para of (block.paragraphs ?? []) as any[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines: OcrLine[] = (para.lines ?? []).map((line: any) => ({
          text: (line.text ?? "").replace(/\s+$/g, ""),
          bbox: line.bbox,
          confidence: norm(line.confidence),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          words: (line.words ?? []).map((word: any) => ({
            text: word.text ?? "",
            bbox: word.bbox,
            confidence: norm(word.confidence),
          })),
        }));

        const text = (para.text ?? lines.map((l) => l.text).join("\n")).trim();
        if (!text) continue;
        paragraphs.push({ text, lines, bbox: para.bbox, confidence: norm(para.confidence) });
      }
    }

    return { paragraphs, width: canvas.width, height: canvas.height };
  }

  async dispose(): Promise<void> {
    await this.worker.terminate();
  }
}

export const tesseractFactory: OcrProviderFactory = {
  id: "tesseract",
  async create(lang: string = DEFAULT_LANG): Promise<OcrProvider> {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker(lang);
    return new TesseractProvider(worker);
  },
};
