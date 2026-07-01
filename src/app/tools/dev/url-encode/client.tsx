"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

export default function UrlEncodePage() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function run() {
    setError(null);
    try {
      setOutput(mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input));
    } catch {
      setOutput("");
      setError("That doesn't look like valid encoded text.");
    }
  }

  async function copy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ToolShell title="URL Encode/Decode" description="Percent-encode or decode a URL or query string.">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button onClick={() => setMode("encode")} className={mode === "encode" ? "btn-primary" : "btn-secondary"}>
            Encode
          </button>
          <button onClick={() => setMode("decode")} className={mode === "decode" ? "btn-primary" : "btn-secondary"}>
            Decode
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "encode" ? "https://example.com/?q=hello world" : "https%3A%2F%2Fexample.com"}
          className="h-32 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 font-mono text-xs outline-none focus:border-node-blue"
        />
        <button onClick={run} disabled={!input} className="btn-primary self-start">
          Convert
        </button>
        {error && <p className="text-sm text-flag-red">{error}</p>}
        {output && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink/70">Output</label>
              <button onClick={copy} className="text-sm font-semibold text-node-blue">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <textarea readOnly value={output} className="h-32 w-full resize-y rounded-lg border border-ink/15 bg-surface p-3 font-mono text-xs" />
          </div>
        )}
      </div>
    </ToolShell>
  );
}
