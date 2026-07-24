"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { Loader2 } from "lucide-react";

export default function RepairPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function repair() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      // Loose parsing tolerates minor structural corruption (bad object
      // refs, malformed xref tables) that would fail a strict parser, then
      // rewrites the file with a clean, valid structure.
      const doc = await PDFDocument.load(bytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false,
      });
      if (doc.getPageCount() === 0) {
        setError("This file has no readable pages — it may be too damaged to repair in the browser.");
        return;
      }
      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "repaired.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError(
        "Couldn't repair this file — it may be too badly damaged, or not a PDF at all.",
      );
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
    <ToolShell title="Repair PDF" description="Attempt to fix a corrupted or malformed PDF.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={repair} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Repairing…" : "Repair PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
