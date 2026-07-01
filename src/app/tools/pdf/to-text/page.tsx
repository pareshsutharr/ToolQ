"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs } from "@/lib/pdfjs";

function itemsToText(items: unknown[]): string {
  let text = "";
  let lastY: number | null = null;
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item) || !("transform" in item)) continue;
    const { str, transform } = item as { str: string; transform: number[] };
    const y = transform[5];
    if (lastY !== null && Math.abs(y - lastY) > 2) {
      text += "\n";
    } else if (text && !text.endsWith("\n") && !text.endsWith(" ")) {
      text += " ";
    }
    text += str;
    lastY = y;
  }
  return text;
}

export default function PdfToTextPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState(false);
  const [likelyScanned, setLikelyScanned] = useState(false);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function convert() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const pdfjsLib = await loadPdfjs();
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pages: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        pages.push(itemsToText(content.items));
      }
      const fullText = pages.join("\n\n");
      setLikelyScanned(fullText.trim().length < 20 * pdf.numPages);
      setPreview(fullText);
      const blob = new Blob([fullText], { type: "text/plain" });
      setResult({
        name: file.name.replace(/\.pdf$/i, "") + ".txt",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't extract text — make sure it's a valid PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function copyText() {
    await navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setFile(null);
    setResult(null);
    setPreview("");
    setError(null);
  }

  return (
    <ToolShell title="PDF to Text" description="Extract raw text content from any PDF.">
      {result ? (
        <div className="flex flex-col gap-3">
          {likelyScanned && (
            <p className="text-sm text-amber">
              Almost no text was found — this PDF may be a scanned image without a text layer.
              Try an OCR tool instead.
            </p>
          )}
          <textarea
            readOnly
            value={preview}
            className="h-48 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 font-mono text-xs text-ink/80"
          />
          <button onClick={copyText} className="btn-secondary self-start">
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
          <ResultList files={[result]} onReset={reset} />
        </div>
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={convert} disabled={busy} className="btn-primary">
            {busy ? "Extracting…" : "Extract Text"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
