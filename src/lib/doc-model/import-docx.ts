// DOCX → document model importer. `mammoth` (dynamically imported so it
// doesn't bloat every route's bundle) converts the .docx into semantic HTML;
// we walk that HTML into the same block schema `import-pdf.ts` produces. Word
// documents have no fixed page boundaries the way a PDF does, so this module
// also paginates the flat block stream itself, using a rough proportional-font
// line-count estimate (no pdf-lib font metrics exist yet at import time) —
// good enough for reflowing text, not meant to be pixel-exact.

import {
  createEmptyDocument,
  createHeadingBlock,
  createImageBlock,
  createListBlock,
  createPage,
  createParagraphBlock,
  createTableBlock,
  DEFAULT_PAGE_SIZE,
} from "./factory";
import type { Block, DocumentModel, Page } from "./types";

const USABLE_WIDTH = DEFAULT_PAGE_SIZE.widthPt - 72 * 2;
/** Rough average glyph width, as a fraction of font size, for a proportional sans-serif font. */
const AVG_CHAR_WIDTH_FACTOR = 0.52;

function estimateLines(text: string, fontSize: number): number {
  const charsPerLine = Math.max(1, Math.floor(USABLE_WIDTH / (fontSize * AVG_CHAR_WIDTH_FACTOR)));
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  let lines = 1;
  let current = 0;
  for (const word of words) {
    const len = word.length + 1;
    if (current > 0 && current + len > charsPerLine) {
      lines += 1;
      current = len;
    } else {
      current += len;
    }
  }
  return lines;
}

function estimateBlockHeight(block: Block): number {
  switch (block.content.kind) {
    case "heading": {
      const size = block.styles.fontSize ?? 16;
      return estimateLines(block.content.text, size) * size * 1.28 + 14;
    }
    case "text": {
      const size = block.styles.fontSize ?? 11;
      return estimateLines(block.content.text, size) * size * 1.38 + 6;
    }
    case "list": {
      const size = block.styles.fontSize ?? 11;
      const lines = block.content.items.reduce((sum, item) => sum + estimateLines(item, size), 0);
      return lines * size * 1.38 + 10;
    }
    case "table":
      return Math.max(52, block.content.rows.length * 20) + 12;
    case "image":
      return Math.max(40, block.dimensions.height || 160) + 12;
    case "signature":
      return 100;
  }
}

function paragraphToBlocks(el: Element): Block[] {
  const img = el.querySelector("img");
  if (img) {
    const src = img.getAttribute("src");
    if (!src || !src.startsWith("data:")) return [];
    const caption = el.textContent?.trim() || img.getAttribute("alt") || undefined;
    return [createImageBlock(src, { caption })];
  }
  const text = el.textContent?.trim() ?? "";
  if (!text) return [];
  return [createParagraphBlock({ text })];
}

function elementToBlocks(el: Element): Block[] {
  const tag = el.tagName.toLowerCase();

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag[1]);
    const text = el.textContent?.trim() ?? "";
    return text ? [createHeadingBlock(text, level, level <= 2 ? 18 : 14)] : [];
  }
  if (tag === "p") return paragraphToBlocks(el);
  if (tag === "ul" || tag === "ol") {
    const items = Array.from(el.querySelectorAll(":scope > li"))
      .map((li) => li.textContent?.trim() ?? "")
      .filter(Boolean);
    return items.length ? [createListBlock(items, tag === "ol")] : [];
  }
  if (tag === "table") {
    const rows = Array.from(el.querySelectorAll(":scope > tr, :scope > tbody > tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td, th")).map((cell) => cell.textContent?.trim() ?? ""),
    );
    return rows.length ? [createTableBlock(rows)] : [];
  }
  if (tag === "img") {
    const src = el.getAttribute("src");
    if (!src || !src.startsWith("data:")) return [];
    return [createImageBlock(src, { caption: el.getAttribute("alt") || undefined })];
  }
  // Unknown container (div, blockquote, section, …) — recurse into its children.
  return Array.from(el.children).flatMap(elementToBlocks);
}

function paginateBlocks(blocks: Block[]): Page[] {
  const pages: Page[] = [];
  let page = createPage(1);
  let cursorY = page.margins.top;
  const usableBottom = page.size.heightPt - page.margins.bottom;

  for (const block of blocks) {
    const height = estimateBlockHeight(block);
    if (page.sections.length > 0 && cursorY + height > usableBottom) {
      pages.push(page);
      page = createPage(pages.length + 1);
      cursorY = page.margins.top;
    }
    block.position = { x: page.margins.left, y: cursorY };
    page.sections.push(block);
    cursorY += height;
  }
  pages.push(page);
  return pages;
}

export async function importDocxToModel(file: File): Promise<DocumentModel> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const blocks = Array.from(parsed.body.children).flatMap(elementToBlocks);

  const model = createEmptyDocument(file.name.replace(/\.docx$/i, ""), "docx");
  model.pages = paginateBlocks(blocks);
  return model;
}
