"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

export default function PercentageCalculatorPage() {
  const [x1, setX1] = useState("20");
  const [y1, setY1] = useState("150");
  const [x2, setX2] = useState("30");
  const [y2, setY2] = useState("150");
  const [from, setFrom] = useState("100");
  const [to, setTo] = useState("125");

  const result1 = (Number(x1) / 100) * Number(y1);
  const result2 = Number(y2) ? (Number(x2) / Number(y2)) * 100 : NaN;
  const change = Number(from) ? ((Number(to) - Number(from)) / Number(from)) * 100 : NaN;

  return (
    <ToolShell title="Percentage Calculator" description="Work out percentages, increases and decreases.">
      <div className="flex flex-col gap-8">
        <div className="card flex flex-col gap-2 p-4">
          <p className="text-sm text-ink/70">
            <input
              value={x1}
              onChange={(e) => setX1(e.target.value)}
              className="w-16 rounded border border-ink/15 px-2 py-1 text-center text-sm"
            />
            % of{" "}
            <input
              value={y1}
              onChange={(e) => setY1(e.target.value)}
              className="w-20 rounded border border-ink/15 px-2 py-1 text-center text-sm"
            />{" "}
            is
          </p>
          <p className="text-2xl font-bold text-node-blue">{Number.isFinite(result1) ? result1.toFixed(2) : "—"}</p>
        </div>

        <div className="card flex flex-col gap-2 p-4">
          <p className="text-sm text-ink/70">
            <input
              value={x2}
              onChange={(e) => setX2(e.target.value)}
              className="w-20 rounded border border-ink/15 px-2 py-1 text-center text-sm"
            />{" "}
            is what % of{" "}
            <input
              value={y2}
              onChange={(e) => setY2(e.target.value)}
              className="w-20 rounded border border-ink/15 px-2 py-1 text-center text-sm"
            />
          </p>
          <p className="text-2xl font-bold text-node-blue">{Number.isFinite(result2) ? `${result2.toFixed(2)}%` : "—"}</p>
        </div>

        <div className="card flex flex-col gap-2 p-4">
          <p className="text-sm text-ink/70">
            % change from{" "}
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-20 rounded border border-ink/15 px-2 py-1 text-center text-sm"
            />{" "}
            to{" "}
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-20 rounded border border-ink/15 px-2 py-1 text-center text-sm"
            />
          </p>
          <p className={`text-2xl font-bold ${change >= 0 ? "text-node-blue" : "text-flag-red"}`}>
            {Number.isFinite(change) ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "—"}
          </p>
        </div>
      </div>
    </ToolShell>
  );
}
