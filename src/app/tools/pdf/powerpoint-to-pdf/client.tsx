"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { Loader2 } from "lucide-react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { extractPptxText } from "@/lib/pptx-text";

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const BODY_SIZE = 12;
const HEADING_SIZE = 16;
const LINE_HEIGHT = BODY_SIZE * 1.4;

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
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

// The Helvetica standard font only covers WinAnsi; drop characters it can't
// encode so a stray glyph never aborts the whole export.
function sanitizeForWinAnsi(text: string): string {
  return text.replace(/[^ -ÿ]/g, "");
}

export default function PowerPointToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  function handleFile(files: File[]) {
    setError(null);
    setResult(null);
    setFile(files[0]);
  }

  async function convert() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const slides = await extractPptxText(file);
      if (slides.every((s) => s.paragraphs.length === 0)) {
        setError("No text could be found in this presentation.");
        return;
      }

      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
      const maxWidth = PAGE_WIDTH - MARGIN * 2;

      for (const slide of slides) {
        let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        let y = PAGE_HEIGHT - MARGIN;

        page.drawText(`Slide ${slide.slideNumber}`, {
          x: MARGIN,
          y,
          size: HEADING_SIZE,
          font: boldFont,
          color: rgb(0.31, 0.27, 0.9),
        });
        y -= HEADING_SIZE * 1.6;

        if (slide.paragraphs.length === 0) {
          page.drawText("(no text on this slide)", {
            x: MARGIN,
            y,
            size: BODY_SIZE,
            font,
            color: rgb(0.6, 0.6, 0.6),
          });
          continue;
        }

        for (const paragraph of slide.paragraphs) {
          const lines = wrapLine(sanitizeForWinAnsi(paragraph), font, BODY_SIZE, maxWidth);
          for (const line of lines) {
            if (y < MARGIN) {
              page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
              y = PAGE_HEIGHT - MARGIN;
            }
            page.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font, color: rgb(0, 0, 0) });
            y -= LINE_HEIGHT;
          }
          y -= LINE_HEIGHT * 0.5;
        }
      }

      const outBytes = await pdf.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({
        name: file.name.replace(/\.pptx$/i, "") + ".pdf",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError(
        "Couldn't read this file — make sure it's a valid .pptx presentation (legacy .ppt isn't supported).",
      );
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell
      title="PowerPoint to PDF"
      description="Extract the text from a PowerPoint presentation into a PDF."
    >
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onFiles={handleFile}
          label="Drop a .pptx file here or click to browse"
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <p className="text-xs text-ink/40">
            Text-only: pulls the words off each slide into a plain PDF, one slide per page. All
            visual design — images, colors, layout, shapes, fonts — is intentionally not
            preserved; there&apos;s no reliable way to render a PowerPoint&apos;s actual visual
            layout fully in a browser. Legacy .ppt files aren&apos;t supported — only the modern
            .pptx format.
          </p>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={convert} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Extracting…" : "Convert to PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
