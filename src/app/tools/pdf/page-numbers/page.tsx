"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";

const POSITIONS = [
  { label: "Bottom center", key: "bottom-center" },
  { label: "Bottom right", key: "bottom-right" },
  { label: "Top center", key: "top-center" },
  { label: "Top right", key: "top-right" },
] as const;

export default function PageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<(typeof POSITIONS)[number]["key"]>("bottom-center");
  const [startAt, setStartAt] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function apply() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const margin = 24;
      const fontSize = 10;

      doc.getPages().forEach((page, i) => {
        const { width, height } = page.getSize();
        const label = String(startAt + i);
        const textWidth = font.widthOfTextAtSize(label, fontSize);
        let x: number;
        let y: number;
        if (position.startsWith("bottom")) y = margin / 2;
        else y = height - margin;
        if (position.endsWith("center")) x = width / 2 - textWidth / 2;
        else x = width - margin - textWidth;
        page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "numbered.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't add page numbers — make sure it's a valid PDF.");
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
    <ToolShell title="Add Page Numbers" description="Number every page, positioned however you like.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink/70">Position</label>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPosition(p.key)}
                  className={position === p.key ? "btn-primary" : "btn-secondary"}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Start numbering at</label>
            <input
              type="number"
              min={0}
              value={startAt}
              onChange={(e) => setStartAt(Number(e.target.value) || 1)}
              className="w-24 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={apply} disabled={busy} className="btn-primary">
            {busy ? "Adding…" : "Add Page Numbers"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
