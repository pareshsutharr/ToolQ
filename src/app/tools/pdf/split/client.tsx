"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";

function parseGroup(group: string, pageCount: number): number[] | null {
  const match = group.trim().match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;
  if (start < 1 || end > pageCount || start > end) return null;
  const indices: number[] = [];
  for (let n = start; n <= end; n++) indices.push(n - 1);
  return indices;
}

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [ranges, setRanges] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultFile[]>([]);

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

  async function runSplit(groups: string[]) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const source = await PDFDocument.load(bytes);
      const out: ResultFile[] = [];
      for (const group of groups) {
        const indices = parseGroup(group, pageCount);
        if (!indices) {
          setError(`"${group}" isn't a valid range for a ${pageCount}-page PDF (try e.g. 1-3).`);
          setBusy(false);
          return;
        }
        const doc = await PDFDocument.create();
        const pages = await doc.copyPages(source, indices);
        pages.forEach((p) => doc.addPage(p));
        const outBytes = await doc.save();
        const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
        const label = indices.length === 1 ? `page-${indices[0] + 1}` : group.replace(/\s+/g, "");
        out.push({ name: `${label}.pdf`, url: URL.createObjectURL(blob), size: blob.size });
      }
      setResults(out);
    } catch {
      setError("Couldn't split this file.");
    } finally {
      setBusy(false);
    }
  }

  function splitByRanges() {
    const groups = ranges.split(",").map((g) => g.trim()).filter(Boolean);
    if (groups.length === 0) {
      setError("Enter at least one page range, e.g. 1-3,5.");
      return;
    }
    runSplit(groups);
  }

  function splitEveryPage() {
    runSplit(Array.from({ length: pageCount }, (_, i) => String(i + 1)));
  }

  function reset() {
    setFile(null);
    setRanges("");
    setResults([]);
    setError(null);
  }

  return (
    <ToolShell
      title="Split PDF"
      description="Extract page ranges into separate PDF files."
    >
      {results.length > 0 ? (
        <ResultList files={results} onReset={reset} zipName="split-pdfs.zip" />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">
            {file.name} — {pageCount} pages
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">
              Ranges — each group becomes its own PDF
            </label>
            <input
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              placeholder="e.g. 1-3,5,7-9"
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
            <p className="mt-1 text-xs text-ink/40">
              &quot;1-3,5&quot; produces two files: pages 1–3, and page 5.
            </p>
          </div>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button onClick={splitByRanges} disabled={busy || !ranges.trim()} className="btn-primary">
              {busy ? "Splitting…" : "Split by Ranges"}
            </button>
            <button onClick={splitEveryPage} disabled={busy} className="btn-secondary">
              {busy ? "Splitting…" : `Split Every Page (${pageCount} files)`}
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
