"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { loadPdfjs, renderPageToCanvas } from "@/lib/pdfjs";
import { canvasToBlob } from "@/lib/image";
import { Loader2 } from "lucide-react";

export default function UnlockPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  function handleFile(files: File[]) {
    setError(null);
    setFile(files[0]);
  }

  async function unlock() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const pdfjsLib = await loadPdfjs();
      const bytes = await file.arrayBuffer();
      let sourcePdf;
      try {
        sourcePdf = await pdfjsLib.getDocument({ data: bytes, password: password || undefined }).promise;
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        if (name === "PasswordException") {
          setError(password ? "That password isn't correct." : "This PDF needs a password to open it.");
          return;
        }
        throw e;
      }

      // Password-protected PDFs can't be re-saved directly (pdf-lib has no
      // decryption support), so we rebuild an unencrypted copy by rendering
      // each page to an image — the tradeoff is text stops being selectable.
      const out = await PDFDocument.create();
      for (let pageNum = 1; pageNum <= sourcePdf.numPages; pageNum++) {
        setProgress(`Unlocking page ${pageNum} of ${sourcePdf.numPages}…`);
        const canvas = await renderPageToCanvas(sourcePdf, pageNum, 2);
        const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
        const imgBytes = await blob.arrayBuffer();
        const image = await out.embedJpg(imgBytes);
        const page = out.addPage([canvas.width / 2, canvas.height / 2]);
        page.drawImage(image, { x: 0, y: 0, width: canvas.width / 2, height: canvas.height / 2 });
      }

      const outBytes = await out.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({
        name: file.name.replace(/\.pdf$/i, "") + "-unlocked.pdf",
        url: URL.createObjectURL(blob),
        size: blob.size,
      });
    } catch {
      setError("Couldn't unlock this file — make sure it's a valid PDF.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function reset() {
    setFile(null);
    setPassword("");
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="Unlock PDF" description="Remove password protection from a PDF.">
      {result ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-amber">
            This removes the password by flattening pages to images — text won&apos;t be
            selectable afterward.
          </p>
          <ResultList files={[result]} onReset={reset} />
        </div>
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a password-protected PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{file.name}</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the PDF's password"
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
          {progress && <p className="text-sm text-node-blue">{progress}</p>}
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={unlock} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Unlocking…" : "Unlock PDF"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
