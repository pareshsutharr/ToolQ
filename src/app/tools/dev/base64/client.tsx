"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function decodeBase64(text: string): string {
  const binary = atob(text);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function Base64Page() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function run() {
    setError(null);
    try {
      setOutput(mode === "encode" ? encodeBase64(input) : decodeBase64(input));
    } catch {
      setOutput("");
      setError(mode === "encode" ? "Couldn't encode this text." : "That's not valid Base64.");
    }
  }

  async function copy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ToolShell title="Base64 Encode/Decode" description="Convert text to and from Base64.">
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
          placeholder={mode === "encode" ? "Text to encode…" : "Base64 to decode…"}
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
