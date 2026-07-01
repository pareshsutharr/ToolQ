"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs } from "@/lib/pdfjs";

const SCALES = [
  { label: "Standard", scale: 1.5 },
  { label: "High-res", scale: 3 },
] as const;

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState<(typeof SCALES)[number]>(SCALES[0]);
  const [quality, setQuality] = useState(0.9);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultFile[]>([]);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function convert() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const pdfjsLib = await loadPdfjs();
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const out: ResultFile[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        setProgress(`Rendering page ${pageNum} of ${pdf.numPages}…`);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale.scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d")!;
        await page.render({ canvasContext: context, viewport }).promise;
        const blob: Blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/jpeg", quality),
        );
        out.push({
          name: pdf.numPages === 1 ? `${file.name.replace(/\.pdf$/i, "")}.jpg` : `page-${pageNum}.jpg`,
          url: URL.createObjectURL(blob),
          size: blob.size,
        });
      }
      setResults(out);
    } catch {
      setError("Couldn't convert this PDF — make sure it's a valid file.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function reset() {
    setFile(null);
    setResults([]);
    setError(null);
  }

  return (
    <ToolShell title="PDF to JPG" description="Export every page as a high-quality JPG image.">
      {results.length > 0 ? (
        <ResultList files={results} onReset={reset} zipName="pdf-pages.zip" />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink/70">Resolution</label>
            <div className="flex gap-2">
              {SCALES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setScale(s)}
                  className={scale.label === s.label ? "btn-primary" : "btn-secondary"}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">
              Quality: {Math.round(quality * 100)}%
            </label>
            <input
              type="range"
              min={0.4}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-node-blue"
            />
          </div>
          {progress && <p className="text-sm text-node-blue">{progress}</p>}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={convert} disabled={busy} className="btn-primary">
            {busy ? "Converting…" : "Convert to JPG"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
