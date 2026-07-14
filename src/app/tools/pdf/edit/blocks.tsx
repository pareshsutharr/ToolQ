"use client";

// Editors for the structured (non-text) block types (Steps 8-10). Each mutates
// the passed block object in place — it is the same reference held in the
// editor's document-model ref — and calls `onChange` so the parent can autosave
// and refresh stats, mirroring how the plain-text blocks work.

import { useReducer, useRef, useState, useEffect } from "react";
import { blockText, type Block } from "@/lib/doc-model";

// ---- Table ----

function TableCell({ initial, onEdit }: { initial: string; onEdit: (text: string) => void }) {
  const ref = useRef<HTMLTableCellElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <td
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onEdit(e.currentTarget.textContent ?? "")}
      className="min-w-[3rem] border border-ink/15 px-2 py-1 align-top text-sm outline-none focus:bg-node-blue/5"
    />
  );
}

export function TableBlockEditor({ block, onChange }: { block: Block; onChange: () => void }) {
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  if (block.content.kind !== "table") return null;
  const content = block.content;
  const rows = content.rows;
  const cols = Math.max(1, ...rows.map((r) => r.length));

  function setCell(r: number, c: number, text: string) {
    while (content.rows[r].length <= c) content.rows[r].push("");
    content.rows[r][c] = text;
    onChange();
  }
  function addRow() {
    content.rows.push(Array.from({ length: cols }, () => ""));
    bump();
    onChange();
  }
  function addCol() {
    content.rows.forEach((row) => {
      while (row.length < cols) row.push("");
      row.push("");
    });
    bump();
    onChange();
  }
  function deleteRow(r: number) {
    if (content.rows.length <= 1) return;
    content.rows.splice(r, 1);
    bump();
    onChange();
  }
  function deleteCol(c: number) {
    if (cols <= 1) return;
    content.rows.forEach((row) => row.splice(c, 1));
    bump();
    onChange();
  }

  return (
    <div className="my-1 overflow-x-auto">
      <table className="border-collapse">
        <tbody>
          {rows.map((row, r) => (
            <tr key={`${r}-${version}`}>
              {Array.from({ length: cols }, (_, c) => (
                <TableCell
                  key={`${r}-${c}-${version}`}
                  initial={row[c] ?? ""}
                  onEdit={(text) => setCell(r, c, text)}
                />
              ))}
              <td className="pl-1 align-middle">
                <button
                  onClick={() => deleteRow(r)}
                  title="Delete row"
                  className="text-xs text-ink/30 hover:text-flag-red"
                  aria-label={`Delete row ${r + 1}`}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          <tr>
            {Array.from({ length: cols }, (_, c) => (
              <td key={c} className="text-center">
                <button
                  onClick={() => deleteCol(c)}
                  title="Delete column"
                  className="text-xs text-ink/30 hover:text-flag-red"
                  aria-label={`Delete column ${c + 1}`}
                >
                  ✕
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="mt-1 flex gap-2">
        <button onClick={addRow} className="btn-secondary px-2 py-1 text-xs">
          + Row
        </button>
        <button onClick={addCol} className="btn-secondary px-2 py-1 text-xs">
          + Column
        </button>
      </div>
    </div>
  );
}

// ---- Image ----

export function ImageBlockEditor({ block, onChange }: { block: Block; onChange: () => void }) {
  const [caption, setCaption] = useState(
    block.content.kind === "image" ? (block.content.caption ?? "") : "",
  );
  const [width, setWidth] = useState(block.dimensions.width || 320);
  if (block.content.kind !== "image") return null;
  const content = block.content;

  function changeWidth(w: number) {
    setWidth(w);
    block.dimensions.width = w;
    onChange();
  }
  function changeCaption(c: string) {
    setCaption(c);
    content.caption = c;
    onChange();
  }

  return (
    <figure className="my-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={content.dataUrl} alt={caption || "image"} style={{ width }} className="rounded" />
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <input
          type="range"
          min={80}
          max={640}
          value={width}
          onChange={(e) => changeWidth(Number(e.target.value))}
          aria-label="Image width"
          className="w-40"
        />
        <input
          value={caption}
          onChange={(e) => changeCaption(e.target.value)}
          placeholder="Caption (optional)"
          className="flex-1 rounded border border-ink/10 px-2 py-1 text-sm focus:border-node-blue focus:outline-none"
        />
      </div>
    </figure>
  );
}

// ---- Signature (rendering an existing one) ----

export function SignatureBlockView({ block, onChange }: { block: Block; onChange: () => void }) {
  const [width, setWidth] = useState(block.dimensions.width || 220);
  if (block.content.kind !== "signature" || !block.content.dataUrl) return null;
  const content = block.content;

  function changeWidth(w: number) {
    setWidth(w);
    block.dimensions.width = w;
    onChange();
  }

  return (
    <div className="my-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={content.dataUrl} alt="signature" style={{ width }} />
      <input
        type="range"
        min={80}
        max={400}
        value={width}
        onChange={(e) => changeWidth(Number(e.target.value))}
        aria-label="Signature width"
        className="mt-1 block w-40"
      />
    </div>
  );
}

// ---- Signature pad (drawing a new one) ----

export function SignaturePad({
  onSave,
  onCancel,
}: {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  function ctx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }
  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (e.currentTarget.width / rect.width),
      y: (e.clientY - rect.top) * (e.currentTarget.height / rect.height),
    };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ctx();
    if (!c) return;
    drawing.current = true;
    hasInk.current = true;
    const { x, y } = pointerPos(e);
    c.beginPath();
    c.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const c = ctx();
    if (!c) return;
    const { x, y } = pointerPos(e);
    c.lineWidth = 2.5;
    c.lineCap = "round";
    c.strokeStyle = "#1C1917";
    c.lineTo(x, y);
    c.stroke();
  }
  function end() {
    drawing.current = false;
  }
  function clear() {
    const c = ctx();
    const canvas = canvasRef.current;
    if (c && canvas) c.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
  }
  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk.current) return;
    onSave(canvas.toDataURL("image/png"));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md p-4">
        <h2 className="mb-2 text-sm font-semibold text-deep-ink">Draw your signature</h2>
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full touch-none rounded border border-ink/20 bg-white"
        />
        <div className="mt-3 flex justify-between">
          <button onClick={clear} className="btn-secondary px-3 py-1.5 text-xs">
            Clear
          </button>
          <div className="flex gap-2">
            <button onClick={onCancel} className="btn-secondary px-3 py-1.5 text-xs">
              Cancel
            </button>
            <button onClick={save} className="btn-primary px-3 py-1.5 text-xs">
              Add signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Read-only fallback preview for block kinds that still lack an editor.
export function ReadOnlyBlock({ block }: { block: Block }) {
  return (
    <div className="rounded border border-ink/10 bg-surface px-3 py-2 text-sm text-ink/70">
      <span className="mr-2 rounded bg-ink/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
        {block.type}
      </span>
      {blockText(block) || (
        <em className="text-ink/40">Editing for this element arrives in a later phase.</em>
      )}
    </div>
  );
}
