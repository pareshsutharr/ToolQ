"use client";

import { useState } from "react";
import md5 from "blueimp-md5";
import ToolShell from "@/components/ToolShell";

const ALGORITHMS = [
  { label: "SHA-1", id: "SHA-1" as const },
  { label: "SHA-256", id: "SHA-256" as const },
  { label: "SHA-512", id: "SHA-512" as const },
];

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function HashGeneratorPage() {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Record<string, string> | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function run() {
    const results: Record<string, string> = { MD5: md5(input) };
    for (const algo of ALGORITHMS) {
      const digest = await crypto.subtle.digest(algo.id, new TextEncoder().encode(input));
      results[algo.label] = bufferToHex(digest);
    }
    setHashes(results);
  }

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <ToolShell title="Hash Generator" description="Generate MD5, SHA-1, SHA-256 and SHA-512 hashes.">
      <div className="flex flex-col gap-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Text to hash…"
          className="h-32 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 font-mono text-xs outline-none focus:border-node-blue"
        />
        <button onClick={run} disabled={!input} className="btn-primary self-start">
          Generate Hashes
        </button>
        {hashes && (
          <div className="card flex flex-col divide-y divide-ink/10 p-0">
            {Object.entries(hashes).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink/50">{key}</p>
                  <p className="truncate font-mono text-xs text-ink/80">{value}</p>
                </div>
                <button onClick={() => copy(key, value)} className="shrink-0 text-sm font-semibold text-node-blue">
                  {copiedKey === key ? "Copied!" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
