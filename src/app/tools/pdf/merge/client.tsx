"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { Loader2 } from "lucide-react";

interface FileEntry {
  file: File;
  pageCount: number | null;
  error: string | null;
}

async function inspectPdf(file: File): Promise<{ pageCount: number | null; error: string | null }> {
  try {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    return { pageCount: doc.getPageCount(), error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/encrypt/i.test(message)) {
      return { pageCount: null, error: "Password protected — unlock it first" };
    }
    return { pageCount: null, error: "Not a valid PDF" };
  }
}

export default function MergePdfPage() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  async function addFiles(newFiles: File[]) {
    setError(null);
    const pending: FileEntry[] = newFiles.map((file) => ({ file, pageCount: null, error: null }));
    setEntries((prev) => [...prev, ...pending]);
    await Promise.all(
      pending.map(async (entry) => {
        const { pageCount, error } = await inspectPdf(entry.file);
        setEntries((prev) =>
          prev.map((e) => (e.file === entry.file ? { ...e, pageCount, error } : e)),
        );
      }),
    );
  }

  function removeFile(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    setEntries((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const validCount = entries.filter((e) => !e.error && e.pageCount !== null).length;
  const hasErrors = entries.some((e) => e.error);

  async function merge() {
    if (validCount < 2) {
      setError("Add at least two valid PDF files to merge.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const merged = await PDFDocument.create();
      for (const entry of entries) {
        if (entry.error) continue;
        const bytes = await entry.file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const bytes = await merged.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "merged.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't merge these files — try removing and re-adding the file that's failing.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setEntries([]);
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="Merge PDF" description="Combine multiple PDFs into one ordered document.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : (
        <div className="flex flex-col gap-4">
          <Dropzone accept="application/pdf" multiple onFiles={addFiles} label="Drop PDFs here or click to browse" />
          {entries.length > 0 && (
            <ul className="card divide-y divide-ink/10">
              {entries.map((entry, i) => (
                <li key={`${entry.file.name}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="text-ink/40 hover:text-node-blue disabled:opacity-20"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === entries.length - 1}
                        className="text-ink/40 hover:text-node-blue disabled:opacity-20"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate">{entry.file.name}</p>
                      {entry.error ? (
                        <p className="text-xs text-flag-red">{entry.error}</p>
                      ) : entry.pageCount !== null ? (
                        <p className="text-xs text-ink/40">{entry.pageCount} pages</p>
                      ) : (
                        <p className="text-xs text-ink/40">Checking…</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => removeFile(i)} className="shrink-0 text-flag-red">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasErrors && (
            <p className="text-sm text-amber">
              Remove or fix the flagged files before merging — they&apos;ll be skipped otherwise.
            </p>
          )}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={merge} disabled={busy || validCount < 2} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Merging…" : `Merge ${validCount || ""} PDFs`}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
