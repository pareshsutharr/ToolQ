"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs, renderPageToCanvas } from "@/lib/pdfjs";
import { Loader2 } from "lucide-react";

export default function CropPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [margins, setMargins] = useState({ top: 10, bottom: 10, left: 10, right: 10 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  async function handleFile(files: File[]) {
    setError(null);
    const f = files[0];
    setFile(f);
    try {
      const pdfjsLib = await loadPdfjs();
      const bytes = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const canvas = await renderPageToCanvas(pdf, 1, 1);
      setPreviewUrl(canvas.toDataURL());
    } catch {
      setPreviewUrl(null);
    }
  }

  function setMargin(key: keyof typeof margins, value: number) {
    setMargins((prev) => ({ ...prev, [key]: Math.max(0, Math.min(45, value)) }));
  }

  async function crop() {
    if (!file) return;
    if (margins.left + margins.right >= 100 || margins.top + margins.bottom >= 100) {
      setError("Margins overlap — reduce them so some page area remains.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const x = (width * margins.left) / 100;
        const y = (height * margins.bottom) / 100;
        const w = width * (1 - margins.left / 100 - margins.right / 100);
        const h = height * (1 - margins.top / 100 - margins.bottom / 100);
        page.setCropBox(x, y, w, h);
      });
      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "cropped.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't crop this file — make sure it's a valid PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="Crop PDF" description="Trim page margins, previewed before you commit.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col items-center gap-4">
          {previewUrl && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Page 1 preview" className="max-h-72 rounded-lg border border-ink/10" />
              <div
                className="absolute bg-deep-ink/50"
                style={{ top: 0, left: 0, right: 0, height: `${margins.top}%` }}
              />
              <div
                className="absolute bg-deep-ink/50"
                style={{ bottom: 0, left: 0, right: 0, height: `${margins.bottom}%` }}
              />
              <div
                className="absolute bg-deep-ink/50"
                style={{ top: 0, bottom: 0, left: 0, width: `${margins.left}%` }}
              />
              <div
                className="absolute bg-deep-ink/50"
                style={{ top: 0, bottom: 0, right: 0, width: `${margins.right}%` }}
              />
            </div>
          )}
          <p className="w-full text-sm text-ink/60">{file.name}</p>
          <div className="grid w-full grid-cols-2 gap-3">
            {(["top", "bottom", "left", "right"] as const).map((key) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium capitalize text-ink/70">
                  {key} margin: {margins[key]}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={45}
                  value={margins[key]}
                  onChange={(e) => setMargin(key, Number(e.target.value))}
                  className="w-full accent-node-blue"
                />
              </div>
            ))}
          </div>
          {error && <p className="w-full text-sm text-flag-red">{error}</p>}
          <button onClick={crop} disabled={busy} className="btn-primary w-full gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Cropping…" : "Crop PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
