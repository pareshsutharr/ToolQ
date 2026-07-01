"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { loadPdfjs } from "@/lib/pdfjs";
import { extractPdfText } from "@/lib/pdf-text";

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export default function ComparePdfPage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parts, setParts] = useState<DiffPart[] | null>(null);

  async function readText(file: File): Promise<string> {
    const pdfjsLib = await loadPdfjs();
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    return (await extractPdfText(pdf)).join("\n\n");
  }

  async function compare() {
    if (!fileA || !fileB) return;
    setBusy(true);
    setError(null);
    try {
      const { diffWords } = await import("diff");
      const [textA, textB] = await Promise.all([readText(fileA), readText(fileB)]);
      setParts(diffWords(textA, textB));
    } catch {
      setError("Couldn't compare these files — make sure both are valid PDFs.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFileA(null);
    setFileB(null);
    setParts(null);
    setError(null);
  }

  const additions = parts?.filter((p) => p.added).length ?? 0;
  const removals = parts?.filter((p) => p.removed).length ?? 0;

  return (
    <ToolShell title="Compare PDF" description="See what changed between two versions of a document.">
      {parts ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink/60">
            <span className="text-node-blue">{additions} additions</span> ·{" "}
            <span className="text-flag-red">{removals} removals</span>
          </p>
          <div className="card max-h-96 overflow-y-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
            {parts.map((part, i) => (
              <span
                key={i}
                className={
                  part.added
                    ? "bg-spark-lime/30 text-deep-ink"
                    : part.removed
                      ? "bg-flag-red/20 text-flag-red line-through"
                      : "text-ink/70"
                }
              >
                {part.value}
              </span>
            ))}
          </div>
          <button onClick={reset} className="btn-secondary self-start">
            Compare different files
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-ink/70">Original</p>
              {fileA ? (
                <p className="card p-3 text-sm text-ink/60">{fileA.name}</p>
              ) : (
                <Dropzone accept="application/pdf" onFiles={(f) => setFileA(f[0])} label="Drop original PDF" />
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink/70">Revised</p>
              {fileB ? (
                <p className="card p-3 text-sm text-ink/60">{fileB.name}</p>
              ) : (
                <Dropzone accept="application/pdf" onFiles={(f) => setFileB(f[0])} label="Drop revised PDF" />
              )}
            </div>
          </div>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={compare} disabled={busy || !fileA || !fileB} className="btn-primary">
            {busy ? "Comparing…" : "Compare PDFs"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
