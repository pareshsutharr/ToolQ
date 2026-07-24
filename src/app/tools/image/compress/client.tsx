"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadImage, canvasToBlob } from "@/lib/image";
import { Loader2 } from "lucide-react";

const FORMATS = [
  { label: "JPEG", mime: "image/jpeg", ext: "jpg", lossless: false },
  { label: "WebP", mime: "image/webp", ext: "webp", lossless: false },
  { label: "PNG", mime: "image/png", ext: "png", lossless: true },
] as const;

function detectTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4 * 37) {
    if (data[i] < 255) return true;
  }
  return false;
}

export default function CompressImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<(typeof FORMATS)[number]>(FORMATS[0]);
  const [hasTransparency, setHasTransparency] = useState(false);
  const [quality, setQuality] = useState(0.7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  async function handleFile(files: File[]) {
    setError(null);
    const f = files[0];
    setFile(f);
    const img = await loadImage(f);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const transparent = detectTransparency(ctx, canvas.width, canvas.height);
    setHasTransparency(transparent);
    setFormat(transparent ? FORMATS[1] : FORMATS[0]);
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
      const ctx = canvas.getContext("2d")!;
      if (format.mime === "image/jpeg") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      const blob = await canvasToBlob(canvas, format.mime, format.lossless ? undefined : quality);
      setResult({
        name: file.name.replace(/\.\w+$/, "") + `-compressed.${format.ext}`,
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
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink/70">Output format</label>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.ext}
                  onClick={() => setFormat(f)}
                  className={format.ext === f.ext ? "btn-primary" : "btn-secondary"}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {hasTransparency && format.mime === "image/jpeg" && (
              <p className="text-xs text-amber">
                This image has transparency — JPEG doesn&apos;t support it, so transparent areas
                will be filled white. Use WebP or PNG to keep transparency.
              </p>
            )}
          </div>
          {format.lossless ? (
            <p className="text-xs text-ink/40">
              PNG is lossless — file size depends on image content, not a quality setting.
            </p>
          ) : (
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
          )}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={compress} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Compressing…" : "Compress Image"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
