"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadImage, canvasToBlob } from "@/lib/image";

export default function ResizeImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [original, setOriginal] = useState({ width: 0, height: 0 });
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  async function handleFile(files: File[]) {
    setError(null);
    const f = files[0];
    const img = await loadImage(f);
    setOriginal({ width: img.naturalWidth, height: img.naturalHeight });
    setWidth(img.naturalWidth);
    setHeight(img.naturalHeight);
    setFile(f);
  }

  function onWidthChange(value: number) {
    setWidth(value);
    if (lockAspect && original.width) {
      setHeight(Math.round((value / original.width) * original.height));
    }
  }

  function onHeightChange(value: number) {
    setHeight(value);
    if (lockAspect && original.height) {
      setWidth(Math.round((value / original.height) * original.width));
    }
  }

  async function resize() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const img = await loadImage(file);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, file.type || "image/png");
      setResult({
        name: file.name.replace(/\.\w+$/, "") + `-${width}x${height}` + (file.name.match(/\.\w+$/)?.[0] ?? ".png"),
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't resize this image.");
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
    <ToolShell title="Resize Image" description="Change image dimensions precisely.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="image/*" onFiles={handleFile} label="Drop an image here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">
            {file.name} — {original.width} × {original.height}px
          </p>
          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Width</label>
              <input
                type="number"
                value={width}
                onChange={(e) => onWidthChange(Number(e.target.value))}
                className="w-28 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Height</label>
              <input
                type="number"
                value={height}
                onChange={(e) => onHeightChange(Number(e.target.value))}
                className="w-28 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={lockAspect}
                onChange={(e) => setLockAspect(e.target.checked)}
              />
              Lock aspect ratio
            </label>
          </div>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={resize} disabled={busy} className="btn-primary">
            {busy ? "Resizing…" : "Resize Image"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
