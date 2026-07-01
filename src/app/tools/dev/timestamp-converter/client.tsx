"use client";

import { useEffect, useMemo, useState } from "react";
import ToolShell from "@/components/ToolShell";

function nowTimestamp() {
  return String(Math.floor(Date.now() / 1000));
}

function nowDateTimeLocal() {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString().slice(0, 16);
}

export default function TimestampConverterPage() {
  // "Now" is inherently different between the server-prerendered HTML and
  // the moment the client hydrates, so start empty on both and fill in the
  // real value client-side only — avoids a hydration mismatch.
  const [timestamp, setTimestamp] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState("");

  useEffect(() => {
    setTimestamp(nowTimestamp());
    setDateTimeLocal(nowDateTimeLocal());
  }, []);

  const fromTimestamp = useMemo(() => {
    const n = Number(timestamp);
    if (!timestamp || !Number.isFinite(n)) return null;
    const ms = timestamp.length > 10 ? n : n * 1000;
    const date = new Date(ms);
    if (isNaN(date.getTime())) return null;
    return { local: date.toString(), utc: date.toUTCString(), iso: date.toISOString() };
  }, [timestamp]);

  const fromDate = useMemo(() => {
    if (!dateTimeLocal) return null;
    const date = new Date(dateTimeLocal);
    if (isNaN(date.getTime())) return null;
    return { seconds: Math.floor(date.getTime() / 1000), ms: date.getTime() };
  }, [dateTimeLocal]);

  return (
    <ToolShell title="Timestamp Converter" description="Convert between Unix timestamps and human-readable dates.">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-ink/70">Unix timestamp</label>
              <input
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2 font-mono text-sm outline-none focus:border-node-blue"
              />
            </div>
            <button onClick={() => setTimestamp(nowTimestamp())} className="btn-secondary">
              Now
            </button>
          </div>
          {fromTimestamp ? (
            <div className="card flex flex-col gap-1 p-4 text-sm">
              <p>
                <span className="text-ink/50">Local:</span> {fromTimestamp.local}
              </p>
              <p>
                <span className="text-ink/50">UTC:</span> {fromTimestamp.utc}
              </p>
              <p>
                <span className="text-ink/50">ISO 8601:</span> {fromTimestamp.iso}
              </p>
            </div>
          ) : (
            <p className="text-sm text-flag-red">Enter a valid Unix timestamp (seconds or milliseconds).</p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-ink/70">Pick a date &amp; time</label>
          <input
            type="datetime-local"
            value={dateTimeLocal}
            onChange={(e) => setDateTimeLocal(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
          />
          {fromDate && (
            <div className="card flex flex-col gap-1 p-4 text-sm">
              <p>
                <span className="text-ink/50">Seconds:</span> {fromDate.seconds}
              </p>
              <p>
                <span className="text-ink/50">Milliseconds:</span> {fromDate.ms}
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
