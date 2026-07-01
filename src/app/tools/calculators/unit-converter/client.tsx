"use client";

import { useMemo, useState } from "react";
import ToolShell from "@/components/ToolShell";

const CATEGORIES = {
  length: {
    label: "Length",
    units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
  },
  weight: {
    label: "Weight",
    units: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 1000 },
  },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

function convertTemperature(value: number, from: string, to: string): number {
  const celsius = from === "C" ? value : from === "F" ? ((value - 32) * 5) / 9 : value - 273.15;
  if (to === "C") return celsius;
  if (to === "F") return (celsius * 9) / 5 + 32;
  return celsius + 273.15;
}

export default function UnitConverterPage() {
  const [category, setCategory] = useState<CategoryKey | "temperature">("length");
  const [value, setValue] = useState("1");
  const [fromUnit, setFromUnit] = useState("m");
  const [toUnit, setToUnit] = useState("ft");

  const units = category === "temperature" ? ["C", "F", "K"] : Object.keys(CATEGORIES[category].units);

  function selectCategory(key: CategoryKey | "temperature") {
    setCategory(key);
    const u = key === "temperature" ? ["C", "F", "K"] : Object.keys(CATEGORIES[key].units);
    setFromUnit(u[0]);
    setToUnit(u[1] ?? u[0]);
  }

  const result = useMemo(() => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (category === "temperature") return convertTemperature(n, fromUnit, toUnit);
    const table = CATEGORIES[category].units as Record<string, number>;
    return (n * table[fromUnit]) / table[toUnit];
  }, [value, fromUnit, toUnit, category]);

  return (
    <ToolShell title="Unit Converter" description="Convert length, weight, and temperature units.">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {(["length", "weight", "temperature"] as const).map((key) => (
            <button
              key={key}
              onClick={() => selectCategory(key)}
              className={category === key ? "btn-primary" : "btn-secondary"}
            >
              {key === "temperature" ? "Temperature" : CATEGORIES[key].label}
            </button>
          ))}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Value</label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">From</label>
            <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm">
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">To</label>
            <select value={toUnit} onChange={(e) => setToUnit(e.target.value)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm">
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        {result !== null && (
          <div className="card p-4">
            <p className="text-2xl font-bold text-node-blue">
              {result.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toUnit}
            </p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
