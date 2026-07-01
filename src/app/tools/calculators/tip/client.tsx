"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

const TIP_PRESETS = [10, 15, 18, 20, 25];

export default function TipCalculatorPage() {
  const [bill, setBill] = useState("50");
  const [tipPercent, setTipPercent] = useState(18);
  const [people, setPeople] = useState(1);

  const billValue = Number(bill) || 0;
  const tipAmount = (billValue * tipPercent) / 100;
  const total = billValue + tipAmount;
  const perPerson = total / Math.max(1, people);

  return (
    <ToolShell title="Tip Calculator" description="Split a bill and calculate the tip amount per person.">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Bill amount</label>
          <input
            value={bill}
            onChange={(e) => setBill(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Tip: {tipPercent}%</label>
          <div className="mb-2 flex gap-2">
            {TIP_PRESETS.map((p) => (
              <button key={p} onClick={() => setTipPercent(p)} className={tipPercent === p ? "btn-primary" : "btn-secondary"}>
                {p}%
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={40}
            value={tipPercent}
            onChange={(e) => setTipPercent(Number(e.target.value))}
            className="w-full accent-node-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Split between</label>
          <input
            type="number"
            min={1}
            value={people}
            onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
          />
        </div>
        <div className="card grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-ink/50">Tip amount</p>
            <p className="text-xl font-bold text-deep-ink">{tipAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-ink/50">Total</p>
            <p className="text-xl font-bold text-deep-ink">{total.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-ink/50">Per person</p>
            <p className="text-xl font-bold text-node-blue">{perPerson.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
