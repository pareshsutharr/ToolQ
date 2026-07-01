"use client";

import { useEffect, useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadImage, canvasToBlob } from "@/lib/image";

const BACKGROUNDS = [
  { label: "Transparent", value: null },
  { label: "White", value: "#FFFFFF" },
  { label: "Black", value: "#000000" },
] as const;

export default function RemoveBackgroundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [background, setBackground] = useState<(typeof BACKGROUNDS)[number]>(BACKGROUNDS[0]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setSourcePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSourcePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function compositeOnBackground(transparentBlob: Blob, color: string): Promise<Blob> {
    const img = await loadImage(new File([transparentBlob], "cutout.png"));
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvasToBlob(canvas, "image/png");
  }

  async function process() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const cutout = await removeBackground(file, {
        progress: (key, current, total) =>
          setProgress(`Loading AI model… ${Math.round((current / total) * 100)}%`),
      });
      const finalBlob = background.value ? await compositeOnBackground(cutout, background.value) : cutout;
      setResultPreview(URL.createObjectURL(finalBlob));
      setResult({
        name: file.name.replace(/\.\w+$/, "") + "-no-bg.png",
        url: URL.createObjectURL(finalBlob),
        size: finalBlob.size,
      });
    } catch {
      setError("Couldn't process this image. Try a smaller file or a different photo.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setResultPreview(null);
    setError(null);
  }

  return (
    <ToolShell
      title="Remove Background"
      description="Instantly isolate a subject with AI — runs entirely in your browser."
    >
      {result ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-center gap-4">
            {sourcePreview && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-ink/40">Before</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sourcePreview} alt="Original" className="h-40 w-40 rounded-lg object-cover" />
              </div>
            )}
            {resultPreview && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-ink/40">After</span>
                <div
                  className="h-40 w-40 rounded-lg"
                  style={{
                    backgroundImage:
                      "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resultPreview} alt="Background removed" className="h-40 w-40 rounded-lg object-cover" />
                </div>
              </div>
            )}
          </div>
          <ResultList files={[result]} onReset={reset} />
        </div>
      ) : !file ? (
        <Dropzone accept="image/*" onFiles={handleFile} label="Drop an image here or click to browse" />
      ) : (
        <div className="flex flex-col items-center gap-4">
          {sourcePreview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={sourcePreview} alt="Preview" className="h-48 w-48 rounded-lg object-cover" />
          )}
          <p className="w-full text-sm text-ink/60">{file.name}</p>
          <div className="flex w-full flex-col gap-2">
            <label className="text-sm font-medium text-ink/70">Result background</label>
            <div className="flex gap-2">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.label}
                  onClick={() => setBackground(b)}
                  className={background.label === b.label ? "btn-primary" : "btn-secondary"}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <p className="w-full text-xs text-ink/40">
            First use downloads a small AI model (~40MB) — it&apos;s cached after that.
          </p>
          {progress && <p className="w-full text-sm text-node-blue">{progress}</p>}
          {error && <p className="w-full text-sm text-flag-red">{error}</p>}
          <button onClick={process} disabled={busy} className="btn-primary w-full">
            {busy ? "Processing…" : "Remove Background"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
