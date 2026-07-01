"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

export default function JsonFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function run(indent: number | null) {
    setError(null);
    try {
      const parsed = JSON.parse(input);
      setOutput(indent === null ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent));
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : "Invalid JSON.");
    }
  }

  async function copy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ToolShell title="JSON Formatter" description="Pretty-print, minify and validate JSON.">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"hello": "world"}'
            className="h-40 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 font-mono text-xs outline-none focus:border-node-blue"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={() => run(2)} className="btn-primary">
            Format
          </button>
          <button onClick={() => run(null)} className="btn-secondary">
            Minify
          </button>
        </div>
        {error && <p className="text-sm text-flag-red">{error}</p>}
        {output && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink/70">Output</label>
              <button onClick={copy} className="text-sm font-semibold text-node-blue">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <textarea
              readOnly
              value={output}
              className="h-56 w-full resize-y rounded-lg border border-ink/15 bg-surface p-3 font-mono text-xs"
            />
          </div>
        )}
      </div>
    </ToolShell>
  );
}
