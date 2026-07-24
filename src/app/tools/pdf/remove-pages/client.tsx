"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { Loader2 } from "lucide-react";

function parseRanges(input: string, pageCount: number): Set<number> {
  const indices = new Set<number>();
  for (const part of input.split(",").map((p) => p.trim()).filter(Boolean)) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) continue;
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    for (let n = start; n <= end; n++) {
      if (n >= 1 && n <= pageCount) indices.add(n - 1);
    }
  }
  return indices;
}

export default function RemovePagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [ranges, setRanges] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  async function handleFile(files: File[]) {
    setError(null);
    const f = files[0];
    try {
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setPageCount(doc.getPageCount());
      setFile(f);
    } catch {
      setError("That doesn't look like a valid PDF.");
    }
  }

  async function removePages() {
    if (!file) return;
    const toRemove = parseRanges(ranges, pageCount);
    if (toRemove.size === 0) {
      setError(`Enter valid page numbers to remove, e.g. 2,4-5 (this PDF has ${pageCount} pages).`);
      return;
    }
    if (toRemove.size >= pageCount) {
      setError("That would remove every page — leave at least one.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      // Remove from highest index to lowest so earlier removals don't shift
      // the indices of pages still queued for removal.
      Array.from(toRemove)
        .sort((a, b) => b - a)
        .forEach((i) => doc.removePage(i));
      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "pages-removed.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't remove those pages.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setRanges("");
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="Remove Pages" description="Delete specific pages from a PDF.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">
            {file.name} — {pageCount} pages
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Pages to remove</label>
            <input
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              placeholder="e.g. 2,4-5"
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={removePages} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Removing…" : "Remove Pages"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
