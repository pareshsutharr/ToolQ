"use client";

import { useEffect, useRef, useState } from "react";
import ToolShell from "@/components/ToolShell";

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic PRNG so the same seed always renders the same avatar.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawIdenticon(canvas: HTMLCanvasElement, seed: string) {
  const size = 250;
  const cells = 5;
  const cellSize = size / cells;
  const hash = hashSeed(seed || "toolq");
  const rand = mulberry32(hash);
  const hue = Math.floor(rand() * 360);
  const fg = `hsl(${hue}, 65%, 55%)`;
  const bg = `hsl(${hue}, 40%, 95%)`;

  const ctx = canvas.getContext("2d")!;
  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fg;

  const half = Math.ceil(cells / 2);
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < half; col++) {
      if (rand() > 0.5) {
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        ctx.fillRect((cells - 1 - col) * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }
}

export default function AvatarGeneratorPage() {
  const [seed, setSeed] = useState("toolq");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) drawIdenticon(canvasRef.current, seed);
  }, [seed]);

  function download() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = `avatar-${seed || "toolq"}.png`;
    link.click();
  }

  return (
    <ToolShell title="Avatar Generator" description="Generate a unique geometric avatar from any name or seed.">
      <div className="flex flex-col items-center gap-4">
        <canvas ref={canvasRef} className="h-48 w-48 rounded-xl border border-ink/10" />
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="Type a name, email or any text…"
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
        />
        <button onClick={download} className="btn-primary w-full">
          Download PNG
        </button>
      </div>
    </ToolShell>
  );
}
