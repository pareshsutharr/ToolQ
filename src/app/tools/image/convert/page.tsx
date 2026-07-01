"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadImage, canvasToBlob } from "@/lib/image";

const FORMATS = [
  { label: "JPG", mime: "image/jpeg", ext: "jpg" },
  { label: "PNG", mime: "image/png", ext: "png" },
  { label: "WebP", mime: "image/webp", ext: "webp" },
] as const;

function isHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

export default function ConvertImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [format, setFormat] = useState<(typeof FORMATS)[number]>(FORMATS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  async function handleFile(files: File[]) {
    setError(null);
    setResult(null);
    setSourcePreview(null);
    const f = files[0];
    setFile(f);

    if (isHeic(f)) {
      setError(
        "HEIC/HEIF photos (the default iPhone format) can't be decoded in a browser yet. Export or share it as JPG from your device first, then convert it here.",
      );
      return;
    }
    try {
      await loadImage(f);
      setSourcePreview(URL.createObjectURL(f));
    } catch {
      setError("This file doesn't look like a supported image format.");
    }
  }

  async function convert() {
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
      const blob = await canvasToBlob(canvas, format.mime, 0.92);
      setResult({
        name: file.name.replace(/\.\w+$/, "") + `.${format.ext}`,
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't convert this image.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setSourcePreview(null);
    setResult(null);
    setError(null);
  }

  const canConvert = file && sourcePreview && !isHeic(file);

  return (
    <ToolShell title="Convert Image Format" description="Convert between JPG, PNG and WebP.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="image/*" onFiles={handleFile} label="Drop an image here or click to browse" />
      ) : (
        <div className="flex flex-col items-center gap-4">
          {sourcePreview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={sourcePreview} alt="Preview" className="max-h-56 max-w-full rounded-lg border border-ink/10" />
          )}
          <p className="w-full text-sm text-ink/60">{file.name}</p>
          {canConvert && (
            <div className="flex w-full gap-2">
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
          )}
          {error && <p className="w-full text-sm text-flag-red">{error}</p>}
          {canConvert && (
            <button onClick={convert} disabled={busy} className="btn-primary w-full">
              {busy ? "Converting…" : `Convert to ${format.label}`}
            </button>
          )}
        </div>
      )}
    </ToolShell>
  );
}
