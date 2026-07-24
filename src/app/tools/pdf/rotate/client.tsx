"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs } from "@/lib/pdfjs";
import { Loader2 } from "lucide-react";

const ANGLES = [90, 180, 270] as const;

export default function RotatePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<(typeof ANGLES)[number]>(90);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d")!;
      await page.render({ canvasContext: context, viewport }).promise;
      setPreviewUrl(canvas.toDataURL("image/png"));
    } catch {
      // Preview is best-effort — the file may still rotate fine even if
      // the thumbnail render fails (e.g. an unusual page structure).
      setPreviewUrl(null);
    }
  }

  async function rotate() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      doc.getPages().forEach((page) => {
        const current = page.getRotation().angle;
        page.setRotation(degrees(current + angle));
      });
      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "rotated.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't rotate this file — make sure it's a valid PDF.");
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
    <ToolShell title="Rotate PDF" description="Fix sideways or upside-down pages.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="w-full text-sm text-ink/60">{file.name}</p>
          {previewUrl && (
            <div className="flex h-56 w-full items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Page 1 preview"
                className="max-h-48 shadow-md transition-transform duration-300"
                style={{ transform: `rotate(${angle}deg)` }}
              />
            </div>
          )}
          <div className="flex w-full gap-2">
            {ANGLES.map((a) => (
              <button
                key={a}
                onClick={() => setAngle(a)}
                className={angle === a ? "btn-primary" : "btn-secondary"}
              >
                {a}°
              </button>
            ))}
          </div>
          {error && <p className="w-full text-sm text-flag-red">{error}</p>}
          <button onClick={rotate} disabled={busy} className="btn-primary w-full gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Rotating…" : "Rotate PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
