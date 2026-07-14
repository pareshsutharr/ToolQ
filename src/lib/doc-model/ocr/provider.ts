// OCR provider abstraction (spec §3.2, Step 4, §8). The rest of the pipeline
// only ever talks to this interface, so the concrete engine — Tesseract today,
// Azure Document Intelligence / AWS Textract later — is selected from a
// registry by id and can be swapped by config, not code changes.
//
// Results are provider-neutral and expressed in the rendered image's pixel
// space; the mapper (./map) converts them into document-model coordinates.

export interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  bbox: OcrBox;
  /** 0..1, normalized by the provider. */
  confidence: number;
}

export interface OcrLine {
  text: string;
  words: OcrWord[];
  bbox: OcrBox;
  confidence: number;
}

export interface OcrParagraph {
  text: string;
  lines: OcrLine[];
  bbox: OcrBox;
  confidence: number;
}

export interface OcrPageResult {
  paragraphs: OcrParagraph[];
  /** Dimensions of the recognized image, in pixels. */
  width: number;
  height: number;
}

export interface OcrProvider {
  readonly id: string;
  recognize(canvas: HTMLCanvasElement): Promise<OcrPageResult>;
  /** Release engine resources (workers, native handles). */
  dispose(): Promise<void>;
}

export interface OcrProviderFactory {
  readonly id: string;
  create(lang?: string): Promise<OcrProvider>;
}

export const DEFAULT_OCR_PROVIDER_ID = "tesseract";

const registry = new Map<string, OcrProviderFactory>();

export function registerOcrProvider(factory: OcrProviderFactory): void {
  registry.set(factory.id, factory);
}

export function getOcrProviderFactory(id: string = DEFAULT_OCR_PROVIDER_ID): OcrProviderFactory {
  const factory = registry.get(id);
  if (!factory) {
    const known = [...registry.keys()].join(", ") || "none";
    throw new Error(`Unknown OCR provider "${id}". Registered providers: ${known}.`);
  }
  return factory;
}
