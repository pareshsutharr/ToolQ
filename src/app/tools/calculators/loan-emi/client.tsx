"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

export default function LoanEmiCalculatorPage() {
  const [principal, setPrincipal] = useState("500000");
  const [rate, setRate] = useState("8.5");
  const [years, setYears] = useState("15");

  const p = Number(principal);
  const annualRate = Number(rate);
  const months = Number(years) * 12;
  const monthlyRate = annualRate / 12 / 100;

  let emi = NaN;
  if (p > 0 && months > 0) {
    emi =
      monthlyRate === 0
        ? p / months
        : (p * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  }
  const totalPayment = emi * months;
  const totalInterest = totalPayment - p;

  return (
    <ToolShell title="Loan / EMI Calculator" description="Calculate monthly loan payments and total interest.">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Loan amount</label>
            <input value={principal} onChange={(e) => setPrincipal(e.target.value)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Interest rate % / yr</label>
            <input value={rate} onChange={(e) => setRate(e.target.value)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Term (years)</label>
            <input value={years} onChange={(e) => setYears(e.target.value)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm" />
          </div>
        </div>
        {Number.isFinite(emi) && emi > 0 ? (
          <div className="card grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink/50">Monthly payment</p>
              <p className="text-xl font-bold text-node-blue">{emi.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Total payment</p>
              <p className="text-xl font-bold text-deep-ink">{totalPayment.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Total interest</p>
              <p className="text-xl font-bold text-deep-ink">{totalInterest.toFixed(2)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-flag-red">Enter a loan amount and term to see the payment breakdown.</p>
        )}
      </div>
    </ToolShell>
  );
}
