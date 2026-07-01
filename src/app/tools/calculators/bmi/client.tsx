"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "text-amber" };
  if (bmi < 25) return { label: "Healthy weight", color: "text-spark-lime" };
  if (bmi < 30) return { label: "Overweight", color: "text-amber" };
  return { label: "Obese", color: "text-flag-red" };
}

export default function BmiCalculatorPage() {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [heightCm, setHeightCm] = useState("170");
  const [weightKg, setWeightKg] = useState("70");
  const [heightFt, setHeightFt] = useState("5");
  const [heightIn, setHeightIn] = useState("7");
  const [weightLb, setWeightLb] = useState("154");

  const heightM = unit === "metric" ? Number(heightCm) / 100 : (Number(heightFt) * 12 + Number(heightIn)) * 0.0254;
  const weightKgValue = unit === "metric" ? Number(weightKg) : Number(weightLb) * 0.453592;
  const bmi = heightM > 0 ? weightKgValue / (heightM * heightM) : NaN;
  const category = Number.isFinite(bmi) && bmi > 0 ? bmiCategory(bmi) : null;

  return (
    <ToolShell title="BMI Calculator" description="Calculate body mass index from height and weight.">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button onClick={() => setUnit("metric")} className={unit === "metric" ? "btn-primary" : "btn-secondary"}>
            Metric (cm/kg)
          </button>
          <button onClick={() => setUnit("imperial")} className={unit === "imperial" ? "btn-primary" : "btn-secondary"}>
            Imperial (ft/lb)
          </button>
        </div>

        {unit === "metric" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Height (cm)</label>
              <input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Weight (kg)</label>
              <input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Height (ft)</label>
              <input value={heightFt} onChange={(e) => setHeightFt(e.target.value)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">(in)</label>
              <input value={heightIn} onChange={(e) => setHeightIn(e.target.value)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Weight (lb)</label>
              <input value={weightLb} onChange={(e) => setWeightLb(e.target.value)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {category && (
          <div className="card flex flex-col gap-1 p-4">
            <p className="text-2xl font-bold text-deep-ink">{bmi.toFixed(1)}</p>
            <p className={`text-sm font-medium ${category.color}`}>{category.label}</p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
