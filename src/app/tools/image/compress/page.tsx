"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadImage, canvasToBlob } from "@/lib/image";

export default function CompressImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(0.7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function compress() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const img = await loadImage(file);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      setResult({
        name: file.name.replace(/\.\w+$/, "") + "-compressed.jpg",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't compress this image.");
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
    <ToolShell title="Compress Image" description="Reduce image file size with minimal quality loss.">
      {result ? (
        <div className="flex flex-col gap-3">
          {file && (
            <p className="text-sm text-ink/60">
              {(file.size / 1024).toFixed(0)} KB → {(result.size! / 1024).toFixed(0)} KB
            </p>
          )}
          <ResultList files={[result]} onReset={reset} />
        </div>
      ) : !file ? (
        <Dropzone accept="image/*" onFiles={handleFile} label="Drop an image here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">
            {file.name} — {(file.size / 1024).toFixed(0)} KB
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">
              Quality: {Math.round(quality * 100)}%
            </label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-node-blue"
            />
          </div>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={compress} disabled={busy} className="btn-primary">
            {busy ? "Compressing…" : "Compress Image"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
