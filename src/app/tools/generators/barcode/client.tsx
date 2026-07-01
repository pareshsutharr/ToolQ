"use client";

import { useRef, useState } from "react";
import ToolShell from "@/components/ToolShell";

const FORMATS = ["CODE128", "EAN13", "UPC", "CODE39"] as const;

export default function BarcodePage() {
  const [text, setText] = useState("123456789012");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("CODE128");
  const [error, setError] = useState<string | null>(null);
  const [hasBarcode, setHasBarcode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function generate() {
    setError(null);
    try {
      const JsBarcode = (await import("jsbarcode")).default;
      if (!canvasRef.current) return;
      JsBarcode(canvasRef.current, text, { format, displayValue: true, margin: 10 });
      setHasBarcode(true);
    } catch {
      setError(`"${text}" isn't a valid value for the ${format} format.`);
      setHasBarcode(false);
    }
  }

  function download() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = "barcode.png";
    link.click();
  }

  return (
    <ToolShell title="Barcode Generator" description="Generate common barcode formats from text or numbers.">
      <div className="flex flex-col items-center gap-4">
        <div className="flex w-full flex-col gap-2">
          <label className="text-sm font-medium text-ink/70">Format</label>
          <div className="flex gap-2">
            {FORMATS.map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={format === f ? "btn-primary" : "btn-secondary"}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
        />
        <button onClick={generate} disabled={!text} className="btn-primary w-full">
          Generate Barcode
        </button>
        {error && <p className="w-full text-sm text-flag-red">{error}</p>}
        <canvas ref={canvasRef} className={hasBarcode ? "max-w-full" : "hidden"} />
        {hasBarcode && (
          <button onClick={download} className="btn-secondary">
            Download PNG
          </button>
        )}
      </div>
    </ToolShell>
  );
}
