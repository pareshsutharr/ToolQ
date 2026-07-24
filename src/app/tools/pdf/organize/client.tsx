"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs, renderPageToCanvas } from "@/lib/pdfjs";
import { Loader2 } from "lucide-react";

interface PageEntry {
  originalIndex: number;
  thumbnailUrl: string;
  rotationDelta: 0 | 90 | 180 | 270;
}

export default function OrganizePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  async function handleFile(files: File[]) {
    setError(null);
    const f = files[0];
    setFile(f);
    setLoadingThumbs(true);
    try {
      const pdfjsLib = await loadPdfjs();
      const bytes = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const entries: PageEntry[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const canvas = await renderPageToCanvas(pdf, i, 0.4);
        entries.push({ originalIndex: i - 1, thumbnailUrl: canvas.toDataURL(), rotationDelta: 0 });
      }
      setPages(entries);
    } catch {
      setError("Couldn't read this PDF's pages.");
    } finally {
      setLoadingThumbs(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    setPages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function rotate(index: number) {
    setPages((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, rotationDelta: ((p.rotationDelta + 90) % 360) as PageEntry["rotationDelta"] } : p,
      ),
    );
  }

  function remove(index: number) {
    setPages((prev) => prev.filter((_, i) => i !== index));
  }

  async function apply() {
    if (!file || pages.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const source = await PDFDocument.load(bytes);
      const out = await PDFDocument.create();
      for (const entry of pages) {
        const [copied] = await out.copyPages(source, [entry.originalIndex]);
        if (entry.rotationDelta) {
          copied.setRotation(degrees(copied.getRotation().angle + entry.rotationDelta));
        }
        out.addPage(copied);
      }
      const outBytes = await out.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "organized.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't rebuild this PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPages([]);
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="Organize PDF" description="Reorder, rotate, or delete pages in one view.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : loadingThumbs ? (
        <p className="text-center text-sm text-ink/60">Loading pages…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">
            {file.name} — {pages.length} pages remaining
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {pages.map((p, i) => (
              <div key={`${p.originalIndex}-${i}`} className="card flex flex-col items-center gap-2 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnailUrl}
                  alt={`Page ${p.originalIndex + 1}`}
                  className="max-h-32 rounded border border-ink/10 transition-transform"
                  style={{ transform: `rotate(${p.rotationDelta}deg)` }}
                />
                <p className="text-xs text-ink/40">Original page {p.originalIndex + 1}</p>
                <div className="flex gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="btn-secondary px-2 py-1 text-xs disabled:opacity-20">
                    ▲
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === pages.length - 1} className="btn-secondary px-2 py-1 text-xs disabled:opacity-20">
                    ▼
                  </button>
                  <button onClick={() => rotate(i)} className="btn-secondary px-2 py-1 text-xs">
                    ↻
                  </button>
                  <button onClick={() => remove(i)} className="btn-secondary px-2 py-1 text-xs text-flag-red">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={apply} disabled={busy || pages.length === 0} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Saving…" : "Save Organized PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
