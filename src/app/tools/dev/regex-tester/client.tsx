"use client";

import { useMemo, useState } from "react";
import ToolShell from "@/components/ToolShell";

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");

  const { matches, error } = useMemo(() => {
    if (!pattern) return { matches: [], error: null };
    try {
      const re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
      const found = Array.from(text.matchAll(re)).map((m) => ({
        text: m[0],
        index: m.index ?? 0,
        groups: m.slice(1),
      }));
      return { matches: found, error: null };
    } catch (e) {
      return { matches: [], error: e instanceof Error ? e.message : "Invalid pattern." };
    }
  }, [pattern, flags, text]);

  const highlighted = useMemo(() => {
    if (!text || matches.length === 0) return null;
    const parts: { text: string; match: boolean }[] = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.index > cursor) parts.push({ text: text.slice(cursor, m.index), match: false });
      parts.push({ text: m.text, match: true });
      cursor = m.index + m.text.length;
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
    return parts;
  }, [text, matches]);

  return (
    <ToolShell title="Regex Tester" description="Test a regular expression against sample text live.">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-ink/70">Pattern</label>
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="\\d+"
              className="w-full rounded-lg border border-ink/15 px-3 py-2 font-mono text-sm outline-none focus:border-node-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Flags</label>
            <input
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              className="w-20 rounded-lg border border-ink/15 px-3 py-2 font-mono text-sm outline-none focus:border-node-blue"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Test string</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-32 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 text-sm outline-none focus:border-node-blue"
          />
        </div>
        {error && <p className="text-sm text-flag-red">{error}</p>}
        {highlighted && (
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">
              {matches.length} match{matches.length === 1 ? "" : "es"}
            </label>
            <p className="whitespace-pre-wrap rounded-lg border border-ink/15 bg-surface p-3 text-sm">
              {highlighted.map((part, i) =>
                part.match ? (
                  <mark key={i} className="rounded bg-spark-lime/50 px-0.5">
                    {part.text}
                  </mark>
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )}
            </p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
