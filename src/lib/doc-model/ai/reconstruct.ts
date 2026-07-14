// Client-side coordinator for AI document reconstruction. Claude is called
// through our server route, so the API key never reaches the browser. Page
// images are processed sequentially to keep memory and provider load bounded.

import {
  createHeadingBlock,
  createImageBlock,
  createParagraphBlock,
  createTableBlock,
} from "../factory";
import type { Block, DocumentModel, Page } from "../types";
import type { AiBounds, AiRebuildBlock, AiRebuildPage } from "./types";

export interface AiRebuildProgress {
  page: number;
  total: number;
  phase: "sending" | "mapping";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeBounds(bounds: AiBounds): AiBounds {
  const x = clamp(Number(bounds.x) || 0, 0, 1);
  const y = clamp(Number(bounds.y) || 0, 0, 1);
  return {
    x,
    y,
    width: clamp(Number(bounds.width) || 0.1, 0.01, 1 - x),
    height: clamp(Number(bounds.height) || 0.04, 0.01, 1 - y),
  };
}

function positionBlock(block: Block, bounds: AiBounds, page: Page): Block {
  const b = safeBounds(bounds);
  block.position = { x: b.x * page.size.widthPt, y: b.y * page.size.heightPt };
  block.dimensions = {
    width: b.width * page.size.widthPt,
    height: b.height * page.size.heightPt,
  };
  block.metadata.source = "ocr";
  block.metadata.ocrConfidence = 0.9;
  return block;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the source page image."));
    image.src = dataUrl;
  });
}

async function cropPageImage(dataUrl: string, bounds: AiBounds): Promise<string> {
  const image = await loadImage(dataUrl);
  const b = safeBounds(bounds);
  const sx = Math.round(b.x * image.naturalWidth);
  const sy = Math.round(b.y * image.naturalHeight);
  const sw = Math.max(1, Math.round(b.width * image.naturalWidth));
  const sh = Math.max(1, Math.round(b.height * image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare an image crop.");
  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function mapBlock(block: AiRebuildBlock, page: Page): Promise<Block | null> {
  const bounds = safeBounds(block.bounds);
  if (block.kind === "heading") {
    const text = block.text?.trim();
    if (!text) return null;
    const result = createHeadingBlock(text, clamp(Math.round(block.level || 2), 1, 3), block.fontSize);
    result.styles.alignment = block.alignment ?? "left";
    return positionBlock(result, bounds, page);
  }
  if (block.kind === "paragraph") {
    const text = block.text?.trim();
    if (!text) return null;
    return positionBlock(
      createParagraphBlock({
        text,
        fontSize: block.fontSize,
        alignment: block.alignment,
        source: "ocr",
        ocrConfidence: 0.9,
      }),
      bounds,
      page,
    );
  }
  if (block.kind === "list") {
    const items = (block.items ?? []).map((item) => item.trim()).filter(Boolean);
    if (!items.length) return null;
    const text = items
      .map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `• ${item}`))
      .join("\n");
    return positionBlock(
      createParagraphBlock({ text, fontSize: block.fontSize, source: "ocr", ocrConfidence: 0.9 }),
      bounds,
      page,
    );
  }
  if (block.kind === "table") {
    const rows = (block.rows ?? []).map((row) => row.map((cell) => String(cell ?? "")));
    if (!rows.length) return null;
    return positionBlock(createTableBlock(rows), bounds, page);
  }
  if (block.kind === "image" && page.backgroundDataUrl) {
    const crop = await cropPageImage(page.backgroundDataUrl, bounds);
    return positionBlock(
      createImageBlock(crop, { caption: block.caption, width: bounds.width * page.size.widthPt }),
      bounds,
      page,
    );
  }
  return null;
}

function splitDataUrl(dataUrl: string): { imageBase64: string; mimeType: string } {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("This page image format cannot be sent for AI reconstruction.");
  return { mimeType: match[1].toLowerCase(), imageBase64: match[2] };
}

async function reconstructPage(page: Page): Promise<AiRebuildPage> {
  if (!page.backgroundDataUrl) throw new Error(`Page ${page.pageNumber} has no source image.`);
  const response = await fetch("/api/doc-ai/reconstruct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(splitDataUrl(page.backgroundDataUrl)),
  });
  const payload = (await response.json().catch(() => null)) as
    | (AiRebuildPage & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || `AI reconstruction failed on page ${page.pageNumber}.`);
  }
  if (!payload || !Array.isArray(payload.blocks)) {
    throw new Error(`AI returned an invalid result for page ${page.pageNumber}.`);
  }
  return payload;
}

/** Rebuilds every page atomically; the model is only changed after all pages succeed. */
export async function reconstructDocumentWithClaude(
  model: DocumentModel,
  onProgress?: (progress: AiRebuildProgress) => void,
): Promise<void> {
  const rebuilt: Block[][] = [];
  for (let index = 0; index < model.pages.length; index += 1) {
    const page = model.pages[index];
    onProgress?.({ page: index + 1, total: model.pages.length, phase: "sending" });
    const result = await reconstructPage(page);
    onProgress?.({ page: index + 1, total: model.pages.length, phase: "mapping" });
    const mapped = await Promise.all(result.blocks.map((block) => mapBlock(block, page)));
    rebuilt.push(
      mapped
        .filter((block): block is Block => block !== null)
        .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x),
    );
  }
  model.pages.forEach((page, index) => {
    page.sections = rebuilt[index];
  });
}

