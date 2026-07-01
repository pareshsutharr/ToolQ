"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

function decodeBase64Url(segment: string): unknown {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export default function JwtDecoderPage() {
  const [token, setToken] = useState("");
  const [header, setHeader] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function decode() {
    setError(null);
    setHeader(null);
    setPayload(null);
    const parts = token.trim().split(".");
    if (parts.length !== 3) {
      setError("A JWT has three dot-separated parts — this doesn't look like one.");
      return;
    }
    try {
      setHeader(JSON.stringify(decodeBase64Url(parts[0]), null, 2));
      setPayload(JSON.stringify(decodeBase64Url(parts[1]), null, 2));
    } catch {
      setError("Couldn't decode this token — it may be malformed.");
    }
  }

  return (
    <ToolShell title="JWT Decoder" description="Inspect a JSON Web Token's header and payload.">
      <div className="flex flex-col gap-4">
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJhbGciOi...  .eyJzdWIiOi...  .SflKxwRJ..."
          className="h-24 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 font-mono text-xs outline-none focus:border-node-blue"
        />
        <button onClick={decode} disabled={!token} className="btn-primary self-start">
          Decode
        </button>
        <p className="text-xs text-ink/40">
          This only decodes the token — it doesn&apos;t verify the signature.
        </p>
        {error && <p className="text-sm text-flag-red">{error}</p>}
        {header && (
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Header</label>
            <pre className="overflow-x-auto rounded-lg border border-ink/15 bg-surface p-3 font-mono text-xs">{header}</pre>
          </div>
        )}
        {payload && (
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Payload</label>
            <pre className="overflow-x-auto rounded-lg border border-ink/15 bg-surface p-3 font-mono text-xs">{payload}</pre>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
