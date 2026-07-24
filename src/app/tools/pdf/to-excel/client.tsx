"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs } from "@/lib/pdfjs";
import { extractPdfRows } from "@/lib/pdf-text";
import { Loader2 } from "lucide-react";

export default function PdfToExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

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
      const XLSX = await import("xlsx");
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pages = await extractPdfRows(pdf);

      // Each page's rows go in one at a time, with a blank separator row
      // between pages, rather than force-fitting the whole document into a
      // single fixed column count (which breaks the moment a page mixes a
      // 2-column key/value table with a 5-column data table).
      const rows: string[][] = [];
      for (const pageRows of pages) {
        if (rows.length > 0) rows.push([]);
        rows.push(...pageRows);
      }

      if (rows.every((r) => r.length === 0)) {
        setError("No text could be extracted — this PDF may be a scanned image without a text layer.");
        return;
      }

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const maxCols = Math.max(1, ...rows.map((r) => r.length));
      worksheet["!cols"] = Array.from({ length: maxCols }, () => ({ wch: 22 }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const outBytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
      const blob = new Blob([outBytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      setResult({
        name: file.name.replace(/\.pdf$/i, "") + ".xlsx",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't convert this PDF.");
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
    <ToolShell title="PDF to Excel" description="Extract text and tables into a spreadsheet.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <p className="text-xs text-ink/40">
            Reconstructs rows and columns from each page&apos;s actual layout — works well for
            structured reports and tables. Two unrelated tables that share the same page row can
            still land on one Excel row; very free-form layouts may not line up perfectly.
          </p>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={convert} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Converting…" : "Convert to Excel"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
