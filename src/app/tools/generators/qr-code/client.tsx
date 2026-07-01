"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

export default function QrCodePage() {
  const [text, setText] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    try {
      const QRCode = (await import("qrcode")).default;
      const url = await QRCode.toDataURL(text, { width: 400, margin: 2 });
      setDataUrl(url);
    } catch {
      setError("Couldn't generate a QR code for that text.");
    }
  }

  return (
    <ToolShell title="QR Code Generator" description="Turn text, a URL or contact info into a scannable QR code.">
      <div className="flex flex-col items-center gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://example.com or any text…"
          className="h-24 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 text-sm outline-none focus:border-node-blue"
        />
        <button onClick={generate} disabled={!text} className="btn-primary w-full">
          Generate QR Code
        </button>
        {error && <p className="w-full text-sm text-flag-red">{error}</p>}
        {dataUrl && (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt="QR code" className="h-56 w-56 rounded-lg border border-ink/10" />
            <a href={dataUrl} download="qr-code.png" className="btn-secondary">
              Download PNG
            </a>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
