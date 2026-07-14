// DOCX (Word) generation, isolated in its own module so the heavy `docx`
// dependency is code-split out of the editor bundle and only loaded when the
// user exports to Word (see exportToDocx in ./export). Runs fully in-browser —
// no server, no external service.

import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  PageBreak,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { dataUrlToBytes } from "./export";
import type { Alignment, Block, DocumentModel } from "./types";

function docxAlignment(a: Alignment | undefined): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (a) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justify":
      return AlignmentType.JUSTIFIED;
    default:
      return AlignmentType.LEFT;
  }
}

function docxHeadingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  if (level <= 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  return HeadingLevel.HEADING_3;
}

// Split on newlines into runs, inserting a soft line break before every line
// after the first so intra-paragraph wrapping is preserved. Word handles full
// Unicode, so no WinAnsi sanitising is needed here (unlike the PDF export).
function docxTextRuns(text: string, sizeHalfPt?: number): TextRun[] {
  return text.split("\n").map(
    (line, i) => new TextRun({ text: line, size: sizeHalfPt, break: i > 0 ? 1 : undefined }),
  );
}

// Narrowed to raster types only — excluding "svg" avoids docx's SvgMediaOptions
// branch, which would require a `fallback` image we never produce.
function docxImageType(mime: string): "png" | "jpg" | "gif" | "bmp" {
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("bmp")) return "bmp";
  return "jpg";
}

// Read an image's intrinsic pixel size so the DOCX embed keeps aspect ratio.
// Runs in the browser (export is a user action), so `Image` is always present.
function imageNaturalSize(dataUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

const DOCX_MAX_IMAGE_WIDTH = 600; // px — keeps images inside the page content width

function docxImageDims(
  block: Block,
  natural: { width: number; height: number } | null,
): { width: number; height: number } {
  let width = block.dimensions.width > 0 ? Math.round(block.dimensions.width) : (natural?.width ?? 320);
  if (width > DOCX_MAX_IMAGE_WIDTH) width = DOCX_MAX_IMAGE_WIDTH;
  let height: number;
  if (natural && natural.width > 0) {
    height = Math.round(width * (natural.height / natural.width));
  } else {
    height = block.dimensions.height > 0 ? Math.round(block.dimensions.height) : Math.round(width * 0.75);
  }
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

async function blockToDocx(block: Block): Promise<(Paragraph | Table)[]> {
  const content = block.content;
  const alignment = docxAlignment(block.styles.alignment);
  switch (content.kind) {
    case "heading": {
      const text = content.text.trim();
      if (!text) return [];
      return [
        new Paragraph({ heading: docxHeadingLevel(content.level), alignment, children: docxTextRuns(text) }),
      ];
    }
    case "text": {
      if (!content.text.trim()) return [];
      const size = block.styles.fontSize ? Math.round(block.styles.fontSize * 2) : undefined;
      return [new Paragraph({ alignment, children: docxTextRuns(content.text, size) })];
    }
    case "list": {
      const items = content.items.map((i) => i.trim()).filter(Boolean);
      return items.map(
        (item) =>
          new Paragraph(
            content.ordered
              ? { numbering: { reference: "toolq-ol", level: 0 }, children: docxTextRuns(item) }
              : { bullet: { level: 0 }, children: docxTextRuns(item) },
          ),
      );
    }
    case "table": {
      const rows = content.rows.filter((r) => r.length > 0);
      if (rows.length === 0) return [];
      const cols = Math.max(1, ...rows.map((r) => r.length));
      const tableRows = rows.map(
        (row) =>
          new TableRow({
            children: Array.from(
              { length: cols },
              (_, c) => new TableCell({ children: [new Paragraph({ children: docxTextRuns(row[c] ?? "") })] }),
            ),
          }),
      );
      return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows })];
    }
    case "image":
    case "signature": {
      if (!content.dataUrl) return [];
      const decoded = dataUrlToBytes(content.dataUrl);
      if (!decoded) return [];
      const natural = await imageNaturalSize(content.dataUrl);
      const { width, height } = docxImageDims(block, natural);
      try {
        const image = new ImageRun({
          data: decoded.bytes,
          type: docxImageType(decoded.mime),
          transformation: { width, height },
        });
        const children: Paragraph[] = [new Paragraph({ alignment, children: [image] })];
        if (content.kind === "image" && content.caption?.trim()) {
          children.push(
            new Paragraph({
              alignment,
              children: [new TextRun({ text: content.caption, italics: true, size: 18 })],
            }),
          );
        }
        return children;
      } catch {
        // A single undecodable image must not abort the whole export.
        return [];
      }
    }
  }
}

export async function buildDocxBlob(model: DocumentModel): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];
  for (let p = 0; p < model.pages.length; p += 1) {
    if (p > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    for (const block of model.pages[p].sections) {
      children.push(...(await blockToDocx(block)));
    }
  }
  if (children.length === 0) children.push(new Paragraph({ text: "" }));

  const doc = new Document({
    creator: "ToolQ",
    title: model.name || "Document",
    numbering: {
      config: [
        {
          reference: "toolq-ol",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }],
        },
      ],
    },
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}
