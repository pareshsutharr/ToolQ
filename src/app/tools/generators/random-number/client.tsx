"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

export default function RandomNumberPage() {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [count, setCount] = useState(1);
  const [allowDuplicates, setAllowDuplicates] = useState(true);
  const [results, setResults] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    if (min >= max) {
      setError("Min must be less than max.");
      return;
    }
    const range = max - min + 1;
    if (!allowDuplicates && count > range) {
      setError(`Can't generate ${count} unique numbers in a range of only ${range}.`);
      return;
    }
    if (allowDuplicates) {
      setResults(Array.from({ length: count }, () => min + Math.floor(Math.random() * range)));
    } else {
      const pool = Array.from({ length: range }, (_, i) => min + i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      setResults(pool.slice(0, count));
    }
  }

  return (
    <ToolShell title="Random Number Generator" description="Generate one or more random numbers in a range.">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Min</label>
            <input
              type="number"
              value={min}
              onChange={(e) => setMin(Number(e.target.value))}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Max</label>
            <input
              type="number"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">How many</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={allowDuplicates} onChange={(e) => setAllowDuplicates(e.target.checked)} />
          Allow duplicates
        </label>
        {error && <p className="text-sm text-flag-red">{error}</p>}
        <button onClick={generate} className="btn-primary self-start">
          Generate
        </button>
        {results.length > 0 && (
          <div className="card flex flex-wrap gap-2 p-4">
            {results.map((n, i) => (
              <span key={i} className="rounded-full bg-surface px-3 py-1 font-mono text-sm text-deep-ink">
                {n}
              </span>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
