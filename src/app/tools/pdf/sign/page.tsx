"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs, renderPageToCanvas } from "@/lib/pdfjs";

export default function SignPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [placement, setPlacement] = useState({ xPercent: 50, yPercent: 85 });
  const [widthPercent, setWidthPercent] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  const padRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  async function handleFile(files: File[]) {
    setError(null);
    const f = files[0];
    setFile(f);
    try {
      const pdfjsLib = await loadPdfjs();
      const bytes = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      setPageCount(pdf.numPages);
      const canvas = await renderPageToCanvas(pdf, 1, 1);
      setPreviewUrl(canvas.toDataURL());
    } catch {
      setError("That doesn't look like a valid PDF.");
    }
  }

  async function loadPagePreview(n: number) {
    if (!file) return;
    const pdfjsLib = await loadPdfjs();
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const canvas = await renderPageToCanvas(pdf, n, 1);
    setPreviewUrl(canvas.toDataURL());
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = padRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = padRef.current!.getContext("2d")!;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = "#111318";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function endDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    setSignatureDataUrl(padRef.current!.toDataURL());
  }

  function clearPad() {
    const canvas = padRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  }

  function placeAt(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPlacement({
      xPercent: ((e.clientX - rect.left) / rect.width) * 100,
      yPercent: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  async function apply() {
    if (!file || !signatureDataUrl) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const page = doc.getPages()[pageNum - 1];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const sigPngBytes = await (await fetch(signatureDataUrl)).arrayBuffer();
      const sigImage = await doc.embedPng(sigPngBytes);
      const sigWidth = pageWidth * (widthPercent / 100);
      const sigHeight = sigWidth * (sigImage.height / sigImage.width);
      const x = (pageWidth * placement.xPercent) / 100 - sigWidth / 2;
      const y = pageHeight * (1 - placement.yPercent / 100) - sigHeight / 2;

      page.drawImage(sigImage, { x, y, width: sigWidth, height: sigHeight });
      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "signed.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't place the signature — make sure it's a valid PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setSignatureDataUrl(null);
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="Sign PDF" description="Draw a signature and place it on the page.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-sm font-medium text-ink/70">1. Draw your signature</p>
            <canvas
              ref={padRef}
              width={400}
              height={140}
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              className="w-full touch-none rounded-lg border border-ink/15 bg-white"
            />
            <button onClick={clearPad} className="btn-secondary mt-2">
              Clear
            </button>
          </div>

          {signatureDataUrl && previewUrl && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink/70">
                2. Click on the page where it goes (page {pageNum} of {pageCount})
              </p>
              {pageCount > 1 && (
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={pageNum}
                  onChange={async (e) => {
                    const n = Math.max(1, Math.min(pageCount, Number(e.target.value) || 1));
                    setPageNum(n);
                    await loadPagePreview(n);
                  }}
                  className="mb-2 w-20 rounded-lg border border-ink/15 px-2 py-1 text-sm"
                />
              )}
              <div className="relative inline-block cursor-crosshair">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Page preview" onClick={placeAt} className="max-h-96 rounded-lg border border-ink/10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signatureDataUrl}
                  alt="Signature placement"
                  className="pointer-events-none absolute"
                  style={{
                    left: `${placement.xPercent}%`,
                    top: `${placement.yPercent}%`,
                    width: `${widthPercent}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              </div>
              <div className="mt-2">
                <label className="mb-1 block text-sm font-medium text-ink/70">
                  Signature size: {widthPercent}% of page width
                </label>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={widthPercent}
                  onChange={(e) => setWidthPercent(Number(e.target.value))}
                  className="w-full accent-node-blue"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={apply} disabled={busy || !signatureDataUrl} className="btn-primary">
            {busy ? "Signing…" : "Sign PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
