"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs } from "@/lib/pdfjs";
import { importPdfToModel, runOcrOnScannedPages, exportToDocx } from "@/lib/doc-model";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  function handleFile(files: File[]) {
    setError(null);
    setResult(null);
    setFile(files[0]);
  }

  async function convert() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(null);
    try {
      const { model, scannedPages } = await importPdfToModel(file, (p) => {
        setProgress(`Reading page ${p.page} of ${p.total}…`);
      });

      if (scannedPages.length > 0) {
        const plural = scannedPages.length === 1 ? "" : "s";
        setProgress(`Running on-device OCR on ${scannedPages.length} scanned page${plural}…`);
        const pdfjsLib = await loadPdfjs();
        const bytes = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        await runOcrOnScannedPages({
          pdf,
          model,
          scannedPageNumbers: scannedPages,
          onProgress: (p) =>
            setProgress(
              `OCR: page ${p.page} of ${p.total} (${p.phase === "rendering" ? "rendering" : "recognizing text"})…`,
            ),
        });
      }

      setProgress("Building Word document…");
      const blob = await exportToDocx(model);
      setResult({
        name: file.name.replace(/\.pdf$/i, "") + ".docx",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't convert this PDF — make sure it's a valid, unencrypted PDF file.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell
      title="PDF to Word"
      description="Convert a PDF into an editable .docx file — runs entirely in your browser."
    >
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <p className="text-xs text-ink/40">
            Reconstructs the page&apos;s paragraphs and relative text sizes into an editable Word
            document — works best for reports, letters, and other text-heavy documents. Scanned
            pages are read automatically with on-device OCR — nothing is ever uploaded. Very dense
            multi-column layouts or tables may not line up exactly.
          </p>
          {progress && (
            <p className="flex items-center gap-2 text-xs text-node-blue">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {progress}
            </p>
          )}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={convert} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Converting…" : "Convert to Word"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
