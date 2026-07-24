"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Loader2 } from "lucide-react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { canvasToBlob } from "@/lib/image";

const DEFAULT_HTML = `<!doctype html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; padding: 32px; color: #1c1917; }
  h1 { color: #4f46e5; }
</style>
</head>
<body>
  <h1>Hello, PDF!</h1>
  <p>Paste or upload your own HTML, then export it as a PDF.</p>
</body>
</html>`;

const PAGE_WIDTH_PT = 612; // US Letter, points
const PAGE_HEIGHT_PT = 792;
const RENDER_SCALE = 2; // html2canvas render density
const RENDER_WIDTH_PX = Math.round(PAGE_WIDTH_PT * (96 / 72)); // Letter width at 96 CSS dpi
const CANVAS_PX_PER_PT = RENDER_SCALE * (96 / 72);

// Renders `html` in a detached, offscreen iframe and resolves once its "load"
// event fires (which — like window.onload — waits for images/stylesheets too,
// not just the HTML parse). Kept separate from the visible live-preview iframe
// so export always rasterizes the exact HTML the user clicked "Convert" on,
// with no dependency on the preview iframe's own render timing.
function renderOffscreen(html: string): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    // No "allow-scripts": pasted HTML must never execute in this page's
    // context. "allow-same-origin" is required so contentDocument can be read
    // from the parent at all — without it the frame gets a unique opaque
    // origin and every DOM access below would silently fail.
    iframe.sandbox.add("allow-same-origin");
    iframe.style.cssText = `position:fixed;top:0;left:-99999px;width:${RENDER_WIDTH_PX}px;height:1px;border:0;`;
    iframe.addEventListener("load", () => resolve(iframe), { once: true });
    iframe.addEventListener("error", () => reject(new Error("render failed")), { once: true });
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
  });
}

export default function HtmlToPdfPage() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  function handleFile(files: File[]) {
    setError(null);
    setResult(null);
    files[0].text().then(setHtml);
  }

  async function convert() {
    setBusy(true);
    setError(null);
    let iframe: HTMLIFrameElement | null = null;
    try {
      iframe = await renderOffscreen(html);
      const body = iframe.contentDocument?.body;
      if (!body) throw new Error("no body");

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(body, {
        scale: RENDER_SCALE,
        width: RENDER_WIDTH_PX,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      if (canvas.width === 0 || canvas.height === 0) {
        setError("This HTML rendered as empty — nothing to convert.");
        return;
      }

      const pdf = await PDFDocument.create();
      const maxSlicePx = Math.round(PAGE_HEIGHT_PT * CANVAS_PX_PER_PT);
      let offsetY = 0;
      while (offsetY < canvas.height) {
        const sliceHeightPx = Math.min(maxSlicePx, canvas.height - offsetY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx,
        );

        const blob = await canvasToBlob(sliceCanvas, "image/png");
        const bytes = await blob.arrayBuffer();
        const embedded = await pdf.embedPng(bytes);
        const pageHeightPt = sliceHeightPx / CANVAS_PX_PER_PT;
        const page = pdf.addPage([PAGE_WIDTH_PT, pageHeightPt]);
        page.drawImage(embedded, { x: 0, y: 0, width: PAGE_WIDTH_PT, height: pageHeightPt });

        offsetY += sliceHeightPx;
      }

      const outBytes = await pdf.save();
      const outBlob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "document.pdf", url: URL.createObjectURL(outBlob), size: outBlob.size });
    } catch {
      setError("Couldn't render this HTML to PDF.");
    } finally {
      iframe?.remove();
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell
      title="HTML to PDF"
      description="Render an HTML file or snippet as a paginated PDF — runs entirely in your browser."
    >
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : (
        <div className="flex flex-col gap-4">
          <Dropzone
            accept=".html,.htm,text/html"
            onFiles={handleFile}
            label="Drop an HTML file here, or paste HTML below"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">HTML source</label>
              <textarea
                value={html}
                onChange={(e) => {
                  setHtml(e.target.value);
                  setResult(null);
                }}
                spellCheck={false}
                className="h-80 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 font-mono text-xs outline-none focus:border-node-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Preview</label>
              <iframe
                srcDoc={html}
                sandbox="allow-same-origin"
                title="HTML preview"
                className="h-80 w-full rounded-lg border border-ink/15 bg-white"
              />
            </div>
          </div>
          <p className="text-xs text-ink/40">
            The preview and export never run scripts from the pasted HTML — only layout and
            styling are rendered. Images must be embedded as data URLs or hosted with CORS
            enabled; remote images without CORS support may appear blank in the exported PDF.
          </p>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={convert} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Rendering…" : "Convert to PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
