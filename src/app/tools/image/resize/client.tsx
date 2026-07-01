"use client";

import { useEffect, useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadImage, canvasToBlob } from "@/lib/image";

const PRESETS = [25, 50, 75, 100] as const;

export default function ResizeImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [original, setOriginal] = useState({ width: 0, height: 0 });
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
    setImage(img);
    setFile(f);
  }

  // Debounced live preview at the target dimensions.
  useEffect(() => {
    if (!image || width < 1 || height < 1) return;
    const timeout = setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(image, 0, 0, width, height);
      setPreviewUrl(canvas.toDataURL());
    }, 250);
    return () => clearTimeout(timeout);
  }, [image, width, height]);

  function clampDimension(value: number) {
    return Math.max(1, Math.round(value) || 1);
  }

  function onWidthChange(value: number) {
    const w = clampDimension(value);
    setWidth(w);
    if (lockAspect && original.width) {
      setHeight(clampDimension((w / original.width) * original.height));
    }
  }

  function onHeightChange(value: number) {
    const h = clampDimension(value);
    setHeight(h);
    if (lockAspect && original.height) {
      setWidth(clampDimension((h / original.height) * original.width));
    }
  }

  function applyPreset(percent: number) {
    onWidthChange(Math.round((original.width * percent) / 100));
  }

  async function resize() {
    if (!file || !image) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(image, 0, 0, width, height);
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
    setImage(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  }

  const isUpscale = width > original.width || height > original.height;

  return (
    <ToolShell title="Resize Image" description="Change image dimensions precisely or by percentage.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="image/*" onFiles={handleFile} label="Drop an image here or click to browse" />
      ) : (
        <div className="flex flex-col items-center gap-4">
          {previewUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={previewUrl} alt="Resize preview" className="max-h-56 max-w-full rounded-lg border border-ink/10" />
          )}
          <p className="w-full text-sm text-ink/60">
            {file.name} — {original.width} × {original.height}px
          </p>
          <div className="flex w-full gap-2">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => applyPreset(p)} className="btn-secondary">
                {p}%
              </button>
            ))}
          </div>
          <div className="flex w-full items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Width</label>
              <input
                type="number"
                min={1}
                value={width}
                onChange={(e) => onWidthChange(Number(e.target.value))}
                className="w-28 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Height</label>
              <input
                type="number"
                min={1}
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
          {isUpscale && (
            <p className="w-full text-xs text-amber">
              Enlarging beyond the original size will look softer — this tool can&apos;t add detail
              that isn&apos;t in the source image.
            </p>
          )}
          {error && <p className="w-full text-sm text-flag-red">{error}</p>}
          <button onClick={resize} disabled={busy} className="btn-primary w-full">
            {busy ? "Resizing…" : "Resize Image"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
