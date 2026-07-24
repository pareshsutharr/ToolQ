"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { importDocxToModel, exportToPdf } from "@/lib/doc-model";

export default function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
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
    try {
      const model = await importDocxToModel(file);
      if (model.pages.every((p) => p.sections.length === 0)) {
        setError("No content could be read from this document.");
        return;
      }
      const blob = await exportToPdf(model);
      setResult({
        name: file.name.replace(/\.docx$/i, "") + ".pdf",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't convert this document — make sure it's a valid .docx file (legacy .doc isn't supported).");
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
    <ToolShell title="Word to PDF" description="Convert a Word (.docx) document into a PDF — runs entirely in your browser.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onFiles={handleFile}
          label="Drop a .docx file here or click to browse"
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <p className="text-xs text-ink/40">
            Preserves headings, paragraphs, bullet/numbered lists, tables and images. Word has no
            fixed page breaks the way a PDF does, so pages are reflowed to fit — very complex
            layouts (columns, precise positioning) may not carry over exactly. Legacy .doc files
            aren&apos;t supported — only the modern .docx format.
          </p>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={convert} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Converting…" : "Convert to PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
