"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs, renderPageToCanvas } from "@/lib/pdfjs";

const RENDER_SCALE = 2;
/** The longer of the two slide dimensions, in inches; the other is derived from page 1's aspect ratio. */
const SLIDE_LONG_SIDE_IN = 10;

export default function PdfToPowerPointPage() {
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
      const pdfjsLib = await loadPdfjs();
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      let slideWidthIn = SLIDE_LONG_SIDE_IN;
      let slideHeightIn = SLIDE_LONG_SIDE_IN;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        setProgress(`Rendering page ${pageNum} of ${pdf.numPages}…`);
        const canvas = await renderPageToCanvas(pdf, pageNum, RENDER_SCALE);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const pageAspect = canvas.width / canvas.height;

        if (pageNum === 1) {
          if (pageAspect >= 1) {
            slideWidthIn = SLIDE_LONG_SIDE_IN;
            slideHeightIn = SLIDE_LONG_SIDE_IN / pageAspect;
          } else {
            slideHeightIn = SLIDE_LONG_SIDE_IN;
            slideWidthIn = SLIDE_LONG_SIDE_IN * pageAspect;
          }
          pptx.defineLayout({ name: "TOOLQ_PDF", width: slideWidthIn, height: slideHeightIn });
          pptx.layout = "TOOLQ_PDF";
        }

        // "Contain" this page's image within the fixed slide size, centered —
        // later pages can have a different aspect ratio than page 1, and
        // stretching would distort them.
        const slideAspect = slideWidthIn / slideHeightIn;
        let w = slideWidthIn;
        let h = slideHeightIn;
        if (pageAspect > slideAspect) {
          h = slideWidthIn / pageAspect;
        } else {
          w = slideHeightIn * pageAspect;
        }
        const x = (slideWidthIn - w) / 2;
        const y = (slideHeightIn - h) / 2;

        const slide = pptx.addSlide();
        slide.addImage({ data: dataUrl, x, y, w, h });
      }

      const blob = (await pptx.write({ outputType: "blob" })) as Blob;
      setResult({
        name: file.name.replace(/\.pdf$/i, "") + ".pptx",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't convert this PDF to a presentation.");
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
      title="PDF to PowerPoint"
      description="Turn each PDF page into a slide — runs entirely in your browser."
    >
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <p className="text-xs text-ink/40">
            Each page becomes a full-slide image in a .pptx presentation, sized to page
            1&apos;s proportions. Slides are images — great for viewing and presenting, but
            text and shapes aren&apos;t individually editable in PowerPoint.
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
            {busy ? "Converting…" : "Convert to PowerPoint"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
