"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

const CHAR_SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

export default function PasswordGeneratorPage() {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ lower: true, upper: true, numbers: true, symbols: true });
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  function toggle(key: keyof typeof options) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function generate() {
    const pool = (Object.keys(options) as (keyof typeof options)[])
      .filter((k) => options[k])
      .map((k) => CHAR_SETS[k])
      .join("");
    if (!pool) return;
    const bytes = crypto.getRandomValues(new Uint32Array(length));
    const result = Array.from(bytes, (b) => pool[b % pool.length]).join("");
    setPassword(result);
  }

  async function copy() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const anyOptionSelected = Object.values(options).some(Boolean);

  return (
    <ToolShell title="Password Generator" description="Create a strong, random password with the rules you choose.">
      <div className="flex flex-col gap-4">
        {password && (
          <div className="card flex items-center justify-between gap-3 p-4">
            <span className="truncate font-mono text-lg text-deep-ink">{password}</span>
            <button onClick={copy} className="shrink-0 text-sm font-semibold text-node-blue">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Length: {length}</label>
          <input
            type="range"
            min={6}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-node-blue"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={options.lower} onChange={() => toggle("lower")} /> Lowercase (a-z)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={options.upper} onChange={() => toggle("upper")} /> Uppercase (A-Z)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={options.numbers} onChange={() => toggle("numbers")} /> Numbers (0-9)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={options.symbols} onChange={() => toggle("symbols")} /> Symbols (!@#…)
          </label>
        </div>
        {!anyOptionSelected && <p className="text-sm text-flag-red">Pick at least one character type.</p>}
        <button onClick={generate} disabled={!anyOptionSelected} className="btn-primary">
          Generate Password
        </button>
      </div>
    </ToolShell>
  );
}
