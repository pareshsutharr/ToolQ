"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { canvasToBlob } from "@/lib/image";
import { loadPdfjs } from "@/lib/pdfjs";
import { Loader2 } from "lucide-react";

const LEVELS = {
  light: {
    label: "Light",
    hint: "Lossless — keeps selectable text, modest size reduction.",
  },
  recommended: {
    label: "Recommended",
    hint: "Converts pages to images at 150 DPI — big size reduction, text no longer selectable.",
    dpi: 150,
    quality: 0.8,
  },
  extreme: {
    label: "Extreme",
    hint: "Converts pages to images at 96 DPI — smallest file, lower visual quality.",
    dpi: 96,
    quality: 0.5,
  },
} as const;

type Level = keyof typeof LEVELS;

async function compressLossless(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("");
  doc.setCreator("");
  return doc.save({ useObjectStreams: true });
}

async function compressByRasterizing(file: File, dpi: number, quality: number): Promise<Uint8Array> {
  const pdfjsLib = await loadPdfjs();
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const out = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const pagePoints = page.getViewport({ scale: 1 });
    const renderViewport = page.getViewport({ scale: dpi / 72 });

    const canvas = document.createElement("canvas");
    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    const context = canvas.getContext("2d")!;
    await page.render({ canvasContext: context, viewport: renderViewport }).promise;

    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    const imgBytes = await blob.arrayBuffer();
    const image = await out.embedJpg(imgBytes);
    const pdfPage = out.addPage([pagePoints.width, pagePoints.height]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: pagePoints.width, height: pagePoints.height });
  }

  return out.save();
}

export default function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("recommended");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);
  const [originalSize, setOriginalSize] = useState(0);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
    setOriginalSize(files[0].size);
  }

  async function compress() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const outBytes =
        level === "light"
          ? await compressLossless(file)
          : await compressByRasterizing(file, LEVELS[level].dpi, LEVELS[level].quality);
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "compressed.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't compress this file — make sure it's a valid, unencrypted PDF.");
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
    <ToolShell title="Compress PDF" description="Shrink PDF file size, with a quality level that fits the job.">
      {result ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink/60">
            {(originalSize / 1024).toFixed(0)} KB → {(result.size! / 1024).toFixed(0)} KB
            {result.size! < originalSize &&
              ` (${Math.round((1 - result.size! / originalSize) * 100)}% smaller)`}
          </p>
          {result.size! >= originalSize && (
            <p className="text-sm text-amber">
              This PDF was already small — {level === "light" ? "there wasn't much left to strip" : "converting its pages to images added more than it saved"}.
              {level !== "light" && " Try Light for text-heavy PDFs, or use this file as-is."}
            </p>
          )}
          <ResultList files={[result]} onReset={reset} />
        </div>
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">
            {file.name} — {(file.size / 1024).toFixed(0)} KB
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink/70">Compression level</label>
            <div className="flex gap-2">
              {(Object.keys(LEVELS) as Level[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setLevel(key)}
                  className={level === key ? "btn-primary" : "btn-secondary"}
                >
                  {LEVELS[key].label}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink/40">{LEVELS[level].hint}</p>
          </div>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={compress} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Compressing…" : "Compress PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
