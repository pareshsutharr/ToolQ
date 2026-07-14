// Exporters: document model → TXT / HTML / PDF / DOCX (Step 18). All text is
// escaped on the way out (Step 23) so content extracted from a crafted PDF can
// never inject markup into an HTML export. DOCX is generated fully in-browser
// (no server) — but the `docx` library is heavy, so it lives in ./export-docx
// and is loaded on demand via dynamic import to keep the editor bundle small.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { blockText, type Block, type DocumentModel } from "./types";

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function exportToTxt(model: DocumentModel): Blob {
  const parts: string[] = [];
  model.pages.forEach((page, i) => {
    if (i > 0) parts.push("\n\f\n"); // form feed marks a page boundary
    for (const block of page.sections) {
      const text = blockText(block);
      if (text.trim()) parts.push(text);
    }
  });
  return new Blob([parts.join("\n\n")], { type: "text/plain;charset=utf-8" });
}

function blockToHtml(block: Block): string {
  const content = block.content;
  switch (content.kind) {
    case "heading": {
      const level = Math.min(6, Math.max(1, content.level));
      return content.text.trim() ? `<h${level}>${escapeHtml(content.text)}</h${level}>` : "";
    }
    case "text": {
      if (!content.text.trim()) return "";
      const style = block.styles.fontSize ? ` style="font-size:${block.styles.fontSize}px"` : "";
      // Preserve intra-paragraph line breaks captured during import.
      return `<p${style}>${escapeHtml(content.text).replace(/\n/g, "<br>")}</p>`;
    }
    case "list": {
      const tag = content.ordered ? "ol" : "ul";
      const items = content.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("");
      return items ? `<${tag}>${items}</${tag}>` : "";
    }
    case "table": {
      const rows = content.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
        .join("");
      return rows ? `<table>${rows}</table>` : "";
    }
    case "image": {
      if (!content.dataUrl) return "";
      const caption = content.caption?.trim()
        ? `<figcaption>${escapeHtml(content.caption)}</figcaption>`
        : "";
      const width = block.dimensions.width ? ` width="${Math.round(block.dimensions.width)}"` : "";
      return `<figure><img src="${content.dataUrl}"${width} alt="${escapeHtml(content.caption ?? "image")}">${caption}</figure>`;
    }
    case "signature": {
      if (!content.dataUrl) return "";
      const width = block.dimensions.width ? ` width="${Math.round(block.dimensions.width)}"` : "";
      return `<img class="signature" src="${content.dataUrl}"${width} alt="signature">`;
    }
  }
}

export function exportToHtml(model: DocumentModel): Blob {
  const body = model.pages
    .map((page) => {
      const blocks = page.sections.map(blockToHtml).filter(Boolean).join("\n");
      return `<section class="page">\n${blocks}\n</section>`;
    })
    .join("\n");

  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(model.name)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; color: #1C1917; }
  .page { padding: 2rem 0; border-bottom: 1px solid #eee; }
  .page:last-child { border-bottom: none; }
  table { border-collapse: collapse; margin: 1rem 0; }
  td { border: 1px solid #ccc; padding: 4px 8px; }
  figure { margin: 1rem 0; }
  figcaption { font-size: 0.85rem; color: #666; margin-top: 0.25rem; }
  img { max-width: 100%; height: auto; }
  img.signature { max-width: 240px; }
</style>
</head>
<body>
${body}
</body>
</html>`;
  return new Blob([doc], { type: "text/html;charset=utf-8" });
}

// pdf-lib PDFPage/PDFFont are only needed structurally here; keep the drawing
// helpers loosely typed to avoid importing internal pdf-lib types.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime: match[1] };
}

function truncateToWidth(text: string, font: any, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && font.widthOfTextAtSize(`${truncated}…`, size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function readingOrder(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
}

function wrapLine(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    const next = `${current} ${word}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

function drawTextBlock(out: any, block: Block, page: DocumentModel["pages"][number], font: any) {
  const text = blockText(block);
  if (!text.trim()) return;
  const size = block.styles.fontSize ?? 12;
  const lineHeight = size * 1.2;
  const startY = page.size.heightPt - block.position.y - size;
  text.split("\n").forEach((line, i) => {
    const y = startY - i * lineHeight;
    if (y < 0) return; // stays on the page; overflow pagination comes later
    out.drawText(sanitizeForWinAnsi(line), {
      x: block.position.x || page.margins.left,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  });
}

function drawTextMask(out: any, block: Block, page: DocumentModel["pages"][number]) {
  const width =
    block.dimensions.width > 0
      ? block.dimensions.width + 4
      : page.size.widthPt - block.position.x - page.margins.right;
  const height = block.dimensions.height > 0 ? block.dimensions.height + 5 : 18;
  const y = page.size.heightPt - block.position.y - height + 2;
  out.drawRectangle({
    x: Math.max(0, block.position.x - 2),
    y: Math.max(0, y),
    width: Math.max(1, width),
    height: Math.max(1, height),
    color: rgb(1, 1, 1),
  });
}

function drawTableBlock(out: any, block: Block, page: DocumentModel["pages"][number], font: any) {
  if (block.content.kind !== "table") return;
  const rows = block.content.rows;
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const size = block.styles.fontSize ?? 11;
  const rowHeight = size + 8;
  const x0 = block.position.x || page.margins.left;
  const tableWidth =
    block.dimensions.width || page.size.widthPt - x0 - page.margins.right || page.size.widthPt / 2;
  const colWidth = tableWidth / cols;
  const topY = page.size.heightPt - block.position.y;

  rows.forEach((row, r) => {
    const cellTop = topY - r * rowHeight;
    if (cellTop - rowHeight < 0) return;
    for (let c = 0; c < cols; c += 1) {
      const cellX = x0 + c * colWidth;
      out.drawRectangle({
        x: cellX,
        y: cellTop - rowHeight,
        width: colWidth,
        height: rowHeight,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 0.5,
      });
      const raw = sanitizeForWinAnsi(row[c] ?? "");
      if (raw) {
        out.drawText(truncateToWidth(raw, font, size, colWidth - 6), {
          x: cellX + 3,
          y: cellTop - size - 3,
          size,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
  });
}

async function drawImageBlock(
  pdf: any,
  out: any,
  block: Block,
  page: DocumentModel["pages"][number],
) {
  const content = block.content;
  if (content.kind !== "image" && content.kind !== "signature") return;
  if (!content.dataUrl) return;
  const decoded = dataUrlToBytes(content.dataUrl);
  if (!decoded) return;
  try {
    const image = decoded.mime.includes("png")
      ? await pdf.embedPng(decoded.bytes)
      : await pdf.embedJpg(decoded.bytes);
    const targetWidth = block.dimensions.width || image.width;
    const scale = targetWidth / image.width;
    const width = image.width * scale;
    const height = image.height * scale;
    const yTop = page.size.heightPt - block.position.y;
    out.drawImage(image, {
      x: block.position.x || page.margins.left,
      y: yTop - height,
      width,
      height,
    });
  } catch {
    // A single undecodable image must not abort the whole export.
  }
}

async function drawPageBackground(
  pdf: any,
  out: any,
  page: DocumentModel["pages"][number],
) {
  if (!page.backgroundDataUrl) return;
  const decoded = dataUrlToBytes(page.backgroundDataUrl);
  if (!decoded) return;
  try {
    const image = decoded.mime.includes("png")
      ? await pdf.embedPng(decoded.bytes)
      : await pdf.embedJpg(decoded.bytes);
    out.drawImage(image, {
      x: 0,
      y: 0,
      width: page.size.widthPt,
      height: page.size.heightPt,
    });
  } catch {
    // Background is a visual aid; export should continue even if it fails.
  }
}

function shouldDrawTextOnPdf(block: Block, hasBackground: boolean): boolean {
  if (!hasBackground) return true;
  return Boolean(block.metadata.updatedAt);
}

async function drawRebuildBlock(
  pdf: any,
  out: any,
  block: Block,
  page: DocumentModel["pages"][number],
  font: any,
  boldFont: any,
  y: number,
): Promise<number> {
  if (block.content.kind === "image" || block.content.kind === "signature") {
    const before = y;
    await drawImageBlock(
      pdf,
      out,
      { ...block, position: { x: page.margins.left, y: page.size.heightPt - y } },
      page,
    );
    return before - Math.max(40, block.dimensions.height || 120) - 12;
  }
  if (block.content.kind === "table") {
    drawTableBlock(
      out,
      { ...block, position: { x: page.margins.left, y: page.size.heightPt - y } },
      page,
      font,
    );
    return y - Math.max(52, block.content.rows.length * 20) - 12;
  }

  const text = blockText(block).trim();
  if (!text) return y;
  const heading = block.content.kind === "heading" || block.type === "heading";
  const size = heading ? 13 : Math.min(12, Math.max(9.5, block.styles.fontSize ?? 10.5));
  const selectedFont = heading ? boldFont : font;
  const lineHeight = size * (heading ? 1.28 : 1.38);
  const indent = /^[•o]\s/.test(text) ? 18 : 0;
  const x = page.margins.left + indent;
  const maxWidth = page.size.widthPt - page.margins.left - page.margins.right - indent;
  const rawLines = text.split("\n").flatMap((line) => wrapLine(sanitizeForWinAnsi(line), selectedFont, size, maxWidth));

  let cursor = y - (heading ? 6 : 0);
  for (const line of rawLines) {
    out.drawText(line, {
      x,
      y: cursor,
      size,
      font: selectedFont,
      color: rgb(0, 0, 0),
    });
    cursor -= lineHeight;
  }
  if (heading) {
    out.drawLine({
      start: { x, y: cursor + 3 },
      end: { x: x + Math.min(maxWidth, selectedFont.widthOfTextAtSize(rawLines[0] ?? "", size)), y: cursor + 3 },
      thickness: 0.5,
      color: rgb(0.2, 0.2, 0.2),
    });
  }
  return cursor - (heading ? 14 : 6);
}

export interface PdfExportOptions {
  rebuild?: boolean;
}

export async function exportToPdf(
  model: DocumentModel,
  options: PdfExportOptions = {},
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const page of model.pages) {
    const out = pdf.addPage([page.size.widthPt, page.size.heightPt]);
    if (options.rebuild) {
      let y = page.size.heightPt - page.margins.top;
      for (const block of readingOrder(page.sections)) {
        y = await drawRebuildBlock(pdf, out, block, page, font, boldFont, y);
        if (y < page.margins.bottom) break;
      }
      continue;
    }

    const hasBackground = Boolean(page.backgroundDataUrl) && !options.rebuild;
    if (hasBackground) await drawPageBackground(pdf, out, page);
    for (const block of page.sections) {
      switch (block.content.kind) {
        case "text":
        case "heading":
        case "list":
          if (shouldDrawTextOnPdf(block, hasBackground)) {
            if (hasBackground) drawTextMask(out, block, page);
            drawTextBlock(out, block, page, font);
          }
          break;
        case "table":
          if (!hasBackground || block.metadata.updatedAt) drawTableBlock(out, block, page, font);
          break;
        case "image":
        case "signature":
          if (!hasBackground || block.metadata.updatedAt) await drawImageBlock(pdf, out, block, page);
          break;
      }
    }
  }

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// The Helvetica standard font only covers WinAnsi; drop characters it cannot
// encode so a stray glyph can't abort the whole export. Full Unicode export
// needs an embedded TrueType font, which comes with the fidelity work later.
function sanitizeForWinAnsi(text: string): string {
  return text.replace(/[^ -ÿ]/g, "");
}

// DOCX export → the heavy `docx` library is code-split into ./export-docx and
// fetched only when the user actually exports to Word, keeping it out of the
// editor's initial bundle.
export async function exportToDocx(model: DocumentModel): Promise<Blob> {
  const { buildDocxBlob } = await import("./export-docx");
  return buildDocxBlob(model);
}

export function exportModelJson(model: DocumentModel): Blob {
  return new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
}
