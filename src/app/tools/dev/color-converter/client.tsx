"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

function hexToRgb(hex: string): [number, number, number] | null {
  const match = hex.trim().replace(/^#/, "").match(/^([0-9a-f]{6})$/i);
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export default function ColorConverterPage() {
  const [hex, setHex] = useState("#4F46E5");
  const [error, setError] = useState<string | null>(null);

  const rgb = hexToRgb(hex);
  const hsl = rgb ? rgbToHsl(...rgb) : null;

  function onHexChange(value: string) {
    setHex(value);
    setError(hexToRgb(value) ? null : "Enter a 6-digit hex color, e.g. #4F46E5.");
  }

  return (
    <ToolShell title="Color Converter" description="Convert colors between HEX, RGB and HSL.">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-24 w-full rounded-lg border border-ink/10"
          style={{ backgroundColor: rgb ? hex : "#ffffff" }}
        />
        <div className="flex w-full items-end gap-3">
          <input
            type="color"
            value={rgb ? hex : "#ffffff"}
            onChange={(e) => onHexChange(e.target.value)}
            className="h-10 w-14 shrink-0 cursor-pointer rounded border border-ink/15"
          />
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-ink/70">Hex</label>
            <input
              value={hex}
              onChange={(e) => onHexChange(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 font-mono text-sm outline-none focus:border-node-blue"
            />
          </div>
        </div>
        {error && <p className="w-full text-sm text-flag-red">{error}</p>}
        {rgb && hsl && (
          <div className="card w-full flex flex-col gap-2 p-4 text-sm">
            <p>
              <span className="text-ink/50">RGB:</span> rgb({rgb[0]}, {rgb[1]}, {rgb[2]})
            </p>
            <p>
              <span className="text-ink/50">HSL:</span> hsl({hsl[0]}, {hsl[1]}%, {hsl[2]}%)
            </p>
            <p>
              <span className="text-ink/50">Hex:</span> {rgbToHex(...rgb)}
            </p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
