"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";

const PAGE_WIDTH = 792; // US Letter landscape, in points
const PAGE_HEIGHT = 612;
const MARGIN = 30;
const ROW_HEIGHT = 18;
const FONT_SIZE = 8;

function truncateToWidth(text: string, maxWidth: number, font: import("pdf-lib").PDFFont, size: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && font.widthOfTextAtSize(result + "…", size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return result + "…";
}

export default function ExcelToPdfPage() {
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
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: "",
      });
      if (rows.length === 0) {
        setError("This spreadsheet appears to be empty.");
        return;
      }

      const colCount = Math.max(...rows.map((r) => r.length));
      const usableWidth = PAGE_WIDTH - MARGIN * 2;
      const colWidth = usableWidth / colCount;

      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

      let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - MARGIN;

      function drawRow(cells: unknown[], bold: boolean) {
        cells.forEach((cell, colIndex) => {
          const x = MARGIN + colIndex * colWidth;
          const text = truncateToWidth(String(cell ?? ""), colWidth - 6, bold ? boldFont : font, FONT_SIZE);
          page.drawText(text, { x: x + 3, y: y - ROW_HEIGHT + 5, size: FONT_SIZE, font: bold ? boldFont : font });
        });
        for (let c = 0; c <= colCount; c++) {
          const x = MARGIN + c * colWidth;
          page.drawLine({
            start: { x, y },
            end: { x, y: y - ROW_HEIGHT },
            thickness: 0.5,
            color: rgb(0.85, 0.85, 0.85),
          });
        }
        page.drawLine({
          start: { x: MARGIN, y: y - ROW_HEIGHT },
          end: { x: MARGIN + usableWidth, y: y - ROW_HEIGHT },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        });
        y -= ROW_HEIGHT;
      }

      const header = rows[0];
      drawRow(header, true);
      for (let r = 1; r < rows.length; r++) {
        if (y - ROW_HEIGHT < MARGIN) {
          page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
          drawRow(header, true);
        }
        drawRow(rows[r], false);
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({
        name: file.name.replace(/\.\w+$/, "") + ".pdf",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't convert this spreadsheet — make sure it's a valid .xlsx, .xls or .csv file.");
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
    <ToolShell title="Excel to PDF" description="Render a spreadsheet as a paginated PDF table.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone
          accept=".xlsx,.xls,.csv"
          onFiles={handleFile}
          label="Drop an Excel or CSV file here or click to browse"
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={convert} disabled={busy} className="btn-primary">
            {busy ? "Converting…" : "Convert to PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
