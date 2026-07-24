"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { loadPdfjs } from "@/lib/pdfjs";
import { extractPdfText } from "@/lib/pdf-text";
import { loadTransformersPipeline } from "@/lib/transformers";
import { Loader2 } from "lucide-react";

const MAX_INPUT_CHARS = 3000;

export default function SummarizePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const pdfjsLib = await loadPdfjs();
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pages = await extractPdfText(pdf);
      const fullText = pages.join("\n\n").replace(/\s+/g, " ").trim();

      if (fullText.length < 50) {
        setError("Almost no text was found — this PDF may be a scanned image. Try OCR first.");
        return;
      }

      const wasTruncated = fullText.length > MAX_INPUT_CHARS;
      setTruncated(wasTruncated);
      const inputText = fullText.slice(0, MAX_INPUT_CHARS);

      setProgress("Loading AI model (first time only)…");
      const pipeline = await loadTransformersPipeline();
      const summarizer = await pipeline("summarization", "Xenova/distilbart-cnn-6-6", {
        dtype: "fp32",
        progress_callback: (p: { status?: string; progress?: number }) => {
          if (p.status === "progress" && typeof p.progress === "number") {
            setProgress(`Loading AI model… ${Math.round(p.progress)}%`);
          }
        },
      });

      setProgress("Summarizing…");
      const output = await summarizer(inputText, { max_new_tokens: 150 });
      const text = Array.isArray(output) ? (output[0] as { summary_text: string }).summary_text : String(output);
      setSummary(text.trim());
    } catch {
      setError("Couldn't summarize this PDF.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function copyText() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setFile(null);
    setSummary(null);
    setError(null);
  }

  return (
    <ToolShell title="AI Summarizer" description="Condense a PDF into key points — runs entirely in your browser.">
      {summary ? (
        <div className="flex flex-col gap-3">
          {truncated && (
            <p className="text-sm text-amber">
              This document is long — the summary is based on roughly its first{" "}
              {MAX_INPUT_CHARS.toLocaleString()} characters.
            </p>
          )}
          <div className="card p-4 text-sm leading-relaxed text-ink/80">{summary}</div>
          <div className="flex gap-3">
            <button onClick={copyText} className="btn-secondary">
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
            <button onClick={reset} className="btn-secondary">
              Start over
            </button>
          </div>
        </div>
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <p className="text-xs text-ink/40">
            First use downloads an AI model (a few hundred MB) — it&apos;s cached after that. No
            data leaves your browser.
          </p>
          {progress && <p className="text-sm text-node-blue">{progress}</p>}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={run} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Working…" : "Summarize"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
