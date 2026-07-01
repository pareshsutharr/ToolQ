"use client";

import { useState } from "react";

export interface ResultFile {
  name: string;
  url: string;
  size?: number;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function ResultList({
  files,
  onReset,
  zipName = "files.zip",
}: {
  files: ResultFile[];
  onReset: () => void;
  zipName?: string;
}) {
  const [zipping, setZipping] = useState(false);

  async function downloadZip() {
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await Promise.all(
        files.map(async (f) => {
          const blob = await (await fetch(f.url)).blob();
          zip.file(f.name, blob);
        }),
      );
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-deep-ink">
          {files.length === 1 ? "Your file is ready" : `${files.length} files ready`}
        </p>
        {files.length > 1 && (
          <button onClick={downloadZip} disabled={zipping} className="text-sm font-semibold text-node-blue">
            {zipping ? "Zipping…" : "Download all as ZIP"}
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {files.map((f) => (
          <li
            key={f.url}
            className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2"
          >
            <span className="truncate text-sm text-ink/80">{f.name}</span>
            <span className="flex items-center gap-3">
              {f.size ? (
                <span className="text-xs text-ink/40">{formatBytes(f.size)}</span>
              ) : null}
              <a href={f.url} download={f.name} className="text-sm font-semibold text-node-blue">
                Download
              </a>
            </span>
          </li>
        ))}
      </ul>
      <button onClick={onReset} className="btn-secondary self-start">
        Start over
      </button>
    </div>
  );
}
