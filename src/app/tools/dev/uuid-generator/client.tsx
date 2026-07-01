"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

export default function UuidGeneratorPage() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  function generate() {
    setUuids(Array.from({ length: count }, () => crypto.randomUUID()));
  }

  async function copyAll() {
    if (uuids.length === 0) return;
    await navigator.clipboard.writeText(uuids.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ToolShell title="UUID Generator" description="Generate random UUID v4 identifiers.">
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">How many</label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="w-24 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
          <button onClick={generate} className="btn-primary">
            Generate
          </button>
        </div>
        {uuids.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink/70">{uuids.length} UUIDs</label>
              <button onClick={copyAll} className="text-sm font-semibold text-node-blue">
                {copied ? "Copied!" : "Copy all"}
              </button>
            </div>
            <textarea
              readOnly
              value={uuids.join("\n")}
              className="h-56 w-full resize-y rounded-lg border border-ink/15 bg-surface p-3 font-mono text-xs"
            />
          </div>
        )}
      </div>
    </ToolShell>
  );
}
