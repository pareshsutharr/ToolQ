"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs, renderPageToCanvas } from "@/lib/pdfjs";
import { canvasToBlob } from "@/lib/image";
import { Loader2 } from "lucide-react";

const RENDER_SCALE = 2.5;

export default function OcrPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const pdfjsLib = await loadPdfjs();
      const { createWorker } = await import("tesseract.js");

      const bytes = await file.arrayBuffer();
      const sourcePdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const out = await PDFDocument.create();
      const font = await out.embedFont(StandardFonts.Helvetica);

      setProgress("Loading OCR engine…");
      const worker = await createWorker("eng");

      for (let pageNum = 1; pageNum <= sourcePdf.numPages; pageNum++) {
        setProgress(`Reading page ${pageNum} of ${sourcePdf.numPages}…`);
        const page = await sourcePdf.getPage(pageNum);
        const pagePoints = page.getViewport({ scale: 1 });
        const canvas = await renderPageToCanvas(sourcePdf, pageNum, RENDER_SCALE);

        const { data } = await worker.recognize(canvas, {}, { blocks: true });
        const words = (data.blocks ?? []).flatMap((b) => b.paragraphs).flatMap((p) => p.lines).flatMap((l) => l.words);

        const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.85);
        const jpegBytes = await jpegBlob.arrayBuffer();
        const bgImage = await out.embedJpg(jpegBytes);
        const outPage = out.addPage([pagePoints.width, pagePoints.height]);
        outPage.drawImage(bgImage, { x: 0, y: 0, width: pagePoints.width, height: pagePoints.height });

        for (const word of words) {
          if (!word.text.trim()) continue;
          const x = word.bbox.x0 / RENDER_SCALE;
          const wordHeight = (word.bbox.y1 - word.bbox.y0) / RENDER_SCALE;
          const y = pagePoints.height - word.bbox.y1 / RENDER_SCALE;
          outPage.drawText(word.text, {
            x,
            y,
            size: Math.max(4, wordHeight),
            font,
            opacity: 0, // invisible — makes the page searchable/selectable
            // without visually duplicating the rendered image's own text.
          });
        }
      }

      await worker.terminate();

      const outBytes = await out.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({
        name: file.name.replace(/\.pdf$/i, "") + "-ocr.pdf",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't run OCR on this file — make sure it's a valid PDF.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="OCR PDF" description="Make a scanned PDF searchable and selectable.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a scanned PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <p className="text-xs text-ink/40">
            First use downloads the OCR engine (~15MB, English) — it&apos;s cached after that. Larger
            PDFs take longer since every page is processed.
          </p>
          {progress && <p className="text-sm text-node-blue">{progress}</p>}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={run} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Running OCR…" : "Run OCR"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
