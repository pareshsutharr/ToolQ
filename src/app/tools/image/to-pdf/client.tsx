"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadImage, canvasToBlob } from "@/lib/image";
import { Loader2 } from "lucide-react";

// Treat source pixels as 96 DPI (standard screen density) and convert to PDF
// points (72/inch) so pages come out at a sane real-world size — using raw
// pixel counts as points would make a 3000px photo a 41-inch-wide "page".
const PIXELS_TO_POINTS = 72 / 96;

export default function ImageToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  function addFiles(newFiles: File[]) {
    setError(null);
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function convert() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const doc = await PDFDocument.create();
      let skipped = 0;
      for (const file of files) {
        try {
          // Normalize every source (JPG/PNG/WebP/whatever the browser can
          // decode) to a plain JPEG via canvas so embedding is uniform and
          // never fails on formats pdf-lib itself can't embed directly.
          const img = await loadImage(file);
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);
          const jpegBytes = await jpegBlob.arrayBuffer();

          const embedded = await doc.embedJpg(jpegBytes);
          const width = embedded.width * PIXELS_TO_POINTS;
          const height = embedded.height * PIXELS_TO_POINTS;
          const page = doc.addPage([width, height]);
          page.drawImage(embedded, { x: 0, y: 0, width, height });
        } catch {
          skipped++;
        }
      }
      if (doc.getPageCount() === 0) {
        setError("Couldn't read any of these files as images.");
        return;
      }
      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "images.pdf", url: URL.createObjectURL(blob), size: blob.size });
      if (skipped > 0) {
        setError(`${skipped} file${skipped > 1 ? "s" : ""} couldn't be read and ${skipped > 1 ? "were" : "was"} skipped.`);
      }
    } catch {
      setError("Couldn't convert these images.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFiles([]);
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="Image to PDF" description="Combine one or more images into a single PDF.">
      {result ? (
        <div className="flex flex-col gap-3">
          {error && <p className="text-sm text-amber">{error}</p>}
          <ResultList files={[result]} onReset={reset} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Dropzone
            accept="image/*"
            multiple
            onFiles={addFiles}
            label="Drop images here or click to browse"
          />
          {files.length > 0 && (
            <ul className="card divide-y divide-ink/10">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="text-ink/40 hover:text-node-blue disabled:opacity-20"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === files.length - 1}
                        className="text-ink/40 hover:text-node-blue disabled:opacity-20"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="truncate">{f.name}</span>
                  </div>
                  <button onClick={() => removeFile(i)} className="shrink-0 text-flag-red">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={convert} disabled={busy || files.length === 0} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Converting…" : `Convert ${files.length || ""} Images to PDF`}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
