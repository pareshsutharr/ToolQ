"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs } from "@/lib/pdfjs";
import { extractPdfText } from "@/lib/pdf-text";
import { loadTransformersPipeline } from "@/lib/transformers";

const DIRECTIONS = [
  { label: "English → Spanish", model: "Xenova/opus-mt-en-es" },
  { label: "Spanish → English", model: "Xenova/opus-mt-es-en" },
  { label: "English → French", model: "Xenova/opus-mt-en-fr" },
  { label: "French → English", model: "Xenova/opus-mt-fr-en" },
  { label: "English → German", model: "Xenova/opus-mt-en-de" },
  { label: "German → English", model: "Xenova/opus-mt-de-en" },
] as const;

const MAX_INPUT_CHARS = 4000;
const CHUNK_SIZE = 400;

function chunkText(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current.length + sentence.length > CHUNK_SIZE && current) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence + " ";
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export default function TranslatePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]>(DIRECTIONS[0]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);
  const [preview, setPreview] = useState("");
  const [truncated, setTruncated] = useState(false);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const pdfjsLib = await loadPdfjs();
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pages = await extractPdfText(pdf);
      const fullText = pages.join(" ").replace(/\s+/g, " ").trim();

      if (fullText.length < 5) {
        setError("Almost no text was found — this PDF may be a scanned image. Try OCR first.");
        return;
      }

      const wasTruncated = fullText.length > MAX_INPUT_CHARS;
      setTruncated(wasTruncated);
      const chunks = chunkText(fullText.slice(0, MAX_INPUT_CHARS));

      setProgress("Loading translation model (first time only)…");
      const pipeline = await loadTransformersPipeline();
      const translator = await pipeline("translation", direction.model, {
        dtype: "fp32",
        progress_callback: (p: { status?: string; progress?: number }) => {
          if (p.status === "progress" && typeof p.progress === "number") {
            setProgress(`Loading translation model… ${Math.round(p.progress)}%`);
          }
        },
      });

      const translated: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        setProgress(`Translating… ${i + 1}/${chunks.length}`);
        const output = await translator(chunks[i]);
        const text = Array.isArray(output) ? (output[0] as { translation_text: string }).translation_text : String(output);
        translated.push(text);
      }

      const fullTranslation = translated.join(" ");
      setPreview(fullTranslation);
      const blob = new Blob([fullTranslation], { type: "text/plain" });
      setResult({
        name: file.name.replace(/\.pdf$/i, "") + "-translated.txt",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't translate this PDF.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setPreview("");
    setError(null);
  }

  return (
    <ToolShell title="Translate PDF" description="Translate a PDF's text — runs entirely in your browser.">
      {result ? (
        <div className="flex flex-col gap-3">
          {truncated && (
            <p className="text-sm text-amber">
              This document is long — only roughly the first {MAX_INPUT_CHARS.toLocaleString()}{" "}
              characters were translated.
            </p>
          )}
          <textarea
            readOnly
            value={preview}
            className="h-48 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 text-sm text-ink/80"
          />
          <ResultList files={[result]} onReset={reset} />
        </div>
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink/70">Direction</label>
            <div className="flex flex-wrap gap-2">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.model}
                  onClick={() => setDirection(d)}
                  className={direction.model === d.model ? "btn-primary" : "btn-secondary"}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink/40">
            First use downloads an AI model per language pair (around 300MB) — it&apos;s cached
            after that. No data leaves your browser.
          </p>
          {progress && <p className="text-sm text-node-blue">{progress}</p>}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={run} disabled={busy} className="btn-primary">
            {busy ? "Working…" : "Translate"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
