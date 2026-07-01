"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export default function TextDiffPage() {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [parts, setParts] = useState<DiffPart[] | null>(null);

  async function compare() {
    const { diffWords } = await import("diff");
    setParts(diffWords(textA, textB));
  }

  const additions = parts?.filter((p) => p.added).length ?? 0;
  const removals = parts?.filter((p) => p.removed).length ?? 0;

  return (
    <ToolShell title="Text Diff Checker" description="Compare two blocks of text and highlight differences.">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Original</label>
            <textarea
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
              className="h-40 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 text-sm outline-none focus:border-node-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Changed</label>
            <textarea
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              className="h-40 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 text-sm outline-none focus:border-node-blue"
            />
          </div>
        </div>
        <button onClick={compare} className="btn-primary self-start">
          Compare
        </button>
        {parts && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/60">
              <span className="text-node-blue">{additions} additions</span> ·{" "}
              <span className="text-flag-red">{removals} removals</span>
            </p>
            <div className="card whitespace-pre-wrap p-4 text-sm leading-relaxed">
              {parts.map((part, i) => (
                <span
                  key={i}
                  className={
                    part.added
                      ? "bg-spark-lime/30 text-deep-ink"
                      : part.removed
                        ? "bg-flag-red/20 text-flag-red line-through"
                        : "text-ink/70"
                  }
                >
                  {part.value}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
