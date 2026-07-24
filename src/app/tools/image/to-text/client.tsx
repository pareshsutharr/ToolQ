"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { Loader2 } from "lucide-react";

export default function ImageToTextPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { createWorker } = await import("tesseract.js");
      setProgress("Loading OCR engine…");
      const worker = await createWorker("eng");
      setProgress("Reading text from image…");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setText(data.text.trim());
    } catch {
      setError("Couldn't read text from this image — try a clearer photo or screenshot.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function copyText() {
    if (text === null) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    if (text === null || !file) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(/\.[^.]+$/, "") + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setFile(null);
    setText(null);
    setError(null);
  }

  return (
    <ToolShell
      title="Image to Text (OCR)"
      description="Extract text from a photo or screenshot, edit it, then export."
    >
      {text !== null ? (
        <div className="flex flex-col gap-3">
          {text.length < 5 && (
            <p className="text-sm text-amber">
              Almost no text was found — try a clearer or higher-resolution image.
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-64 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 font-mono text-xs text-ink/80"
          />
          <div className="flex flex-wrap gap-3">
            <button onClick={copyText} className="btn-secondary">
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
            <button onClick={download} className="btn-primary">
              Download .txt
            </button>
          </div>
          <button onClick={reset} className="btn-secondary self-start">
            Start over
          </button>
        </div>
      ) : !file ? (
        <Dropzone accept="image/*" onFiles={handleFile} label="Drop an image here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <p className="text-xs text-ink/40">
            First use downloads the OCR engine (~15MB, English) — it&apos;s cached after that.
          </p>
          {progress && <p className="text-sm text-node-blue">{progress}</p>}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={run} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Reading text…" : "Extract Text"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
