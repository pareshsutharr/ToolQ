"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";

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

  async function convert() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const doc = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const isPng = file.type === "image/png";
        const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const page = doc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }
      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "images.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't convert these images — only JPG and PNG are supported.");
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
        <ResultList files={[result]} onReset={reset} />
      ) : (
        <div className="flex flex-col gap-4">
          <Dropzone
            accept="image/jpeg,image/png"
            multiple
            onFiles={addFiles}
            label="Drop JPG or PNG images here or click to browse"
          />
          {files.length > 0 && (
            <ul className="card divide-y divide-ink/10">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="truncate">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="text-flag-red">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={convert} disabled={busy || files.length === 0} className="btn-primary">
            {busy ? "Converting…" : `Convert ${files.length || ""} Images to PDF`}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
