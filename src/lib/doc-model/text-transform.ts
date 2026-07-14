// "Text only" conversion: turn the document into clean, flowing, editable text
// — the plain-text answer to "just give me the words". PDF text extraction and
// OCR both keep every visual line break, which makes paragraphs read as many
// short broken lines; this reflows each paragraph into one continuous line
// (de-hyphenating words split across a line break), keeps headings and body
// text, flattens tables and lists into text, and drops images/signatures.
//
// It rewrites the model in place, so callers should snapshot a version first
// (it stays fully undoable from version history).

import { bumpRevision, createParagraphBlock } from "./factory";
import type { Block, DocumentModel } from "./types";

/**
 * Joins the lines of one paragraph into a single flowing line. A line ending in
 * a letter+hyphen is treated as a word split across the wrap and glued back
 * together ("informa-\ntion" → "information"); every other break becomes a
 * space. Numeric/symbol hyphens (ranges like "2021-\n22") keep their space so
 * they aren't silently fused.
 */
export function reflowParagraph(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  let out = lines[0];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/[A-Za-zÀ-ÿ]-$/.test(out)) {
      out = out.slice(0, -1) + line;
    } else {
      out += ` ${line}`;
    }
  }
  return out.replace(/[ \t]+/g, " ").trim();
}

/**
 * Rewrites `model` into a text-only document: headings and paragraphs are
 * reflowed, lists become bulleted text lines, tables become tab-separated text,
 * and images/signatures are removed. Empty blocks (e.g. scanned placeholders)
 * are dropped. Bumps the revision; snapshot a version before calling.
 */
export function convertModelToText(model: DocumentModel): void {
  for (const page of model.pages) {
    const next: Block[] = [];
    for (const block of page.sections) {
      const content = block.content;
      switch (content.kind) {
        case "heading":
        case "text": {
          const reflowed = reflowParagraph(content.text);
          if (reflowed) {
            content.text = reflowed;
            next.push(block);
          }
          break;
        }
        case "list": {
          const items = content.items.map((i) => i.trim()).filter(Boolean);
          if (items.length) {
            next.push(createParagraphBlock({ text: items.map((i) => `• ${i}`).join("\n") }));
          }
          break;
        }
        case "table": {
          const lines = content.rows
            .map((row) => row.map((cell) => cell.trim()).join("\t"))
            .filter((line) => line.replace(/\t/g, "").trim().length > 0);
          if (lines.length) {
            next.push(createParagraphBlock({ text: lines.join("\n") }));
          }
          break;
        }
        // image / signature → dropped (text only)
      }
    }
    page.sections = next;
  }
  bumpRevision(model);
}
