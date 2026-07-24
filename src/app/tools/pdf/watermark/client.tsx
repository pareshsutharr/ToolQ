"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { Loader2 } from "lucide-react";

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function apply() {
    if (!file || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);

      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const fontSize = Math.min(width, height) / 8;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: width / 2 - textWidth / 2,
          y: height / 2,
          size: fontSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity,
          rotate: degrees(45),
        });
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "watermarked.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't add a watermark — make sure it's a valid PDF.");
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
    <ToolShell title="Add Watermark" description="Overlay diagonal text across every page.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Watermark text</label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">
              Opacity: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min={0.05}
              max={0.6}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-node-blue"
            />
          </div>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={apply} disabled={busy || !text.trim()} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Adding…" : "Add Watermark"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
