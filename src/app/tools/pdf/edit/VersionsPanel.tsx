"use client";

// Version-history UI (Step 15): save named snapshots, and restore / compare /
// duplicate / rename / delete existing ones. The compare view renders a
// line-level diff using the `diff` package already in the project.

import { useState } from "react";
import { diffLines } from "diff";
import type { VersionSummary } from "@/lib/doc-model";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function VersionsPanel({
  versions,
  busy,
  onSaveVersion,
  onRestore,
  onCompare,
  onDuplicate,
  onDelete,
  onRename,
}: {
  versions: VersionSummary[];
  busy: boolean;
  onSaveVersion: (label: string) => void;
  onRestore: (id: string) => void;
  onCompare: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, label: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  function save() {
    onSaveVersion(label.trim());
    setLabel("");
  }

  function commitRename(id: string) {
    onRename(id, editingLabel);
    setEditingId(null);
    setEditingLabel("");
  }

  return (
    <div className="flex flex-col gap-3 border-t border-ink/10 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Version label (optional)"
          aria-label="Version label"
          className="flex-1 rounded border border-ink/10 px-2 py-1 text-sm focus:border-node-blue focus:outline-none"
        />
        <button onClick={save} disabled={busy} className="btn-primary px-3 py-1.5 text-xs">
          Save version
        </button>
      </div>

      {versions.length === 0 ? (
        <p className="text-xs text-ink/40">No versions yet.</p>
      ) : (
        <ul className="flex max-h-64 flex-col divide-y divide-ink/5 overflow-auto">
          {versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-ink/5 text-[11px] font-medium text-ink/60">
                {v.versionNumber}
              </span>
              <div className="min-w-0 flex-1">
                {editingId === v.id ? (
                  <input
                    autoFocus
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    onBlur={() => commitRename(v.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(v.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full rounded border border-ink/10 px-1 py-0.5 text-sm focus:border-node-blue focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(v.id);
                      setEditingLabel(v.label);
                    }}
                    className="block max-w-full truncate text-left text-sm font-medium text-deep-ink hover:text-node-blue"
                    title="Rename"
                  >
                    {v.label}
                  </button>
                )}
                <p className="text-[11px] text-ink/40">
                  {formatTime(v.createdAt)} · {v.createdBy}
                </p>
              </div>
              <div className="flex shrink-0 gap-1 text-xs">
                <button onClick={() => onRestore(v.id)} className="btn-secondary px-2 py-1">
                  Restore
                </button>
                <button onClick={() => onCompare(v.id)} className="btn-secondary px-2 py-1">
                  Compare
                </button>
                <button onClick={() => onDuplicate(v.id)} className="btn-secondary px-2 py-1">
                  Duplicate
                </button>
                <button
                  onClick={() => onDelete(v.id)}
                  className="btn-secondary px-2 py-1 text-flag-red"
                  aria-label={`Delete version ${v.versionNumber}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DiffView({
  title,
  oldText,
  newText,
  onClose,
}: {
  title: string;
  oldText: string;
  newText: string;
  onClose: () => void;
}) {
  const parts = diffLines(oldText, newText);
  const unchanged = parts.every((p) => !p.added && !p.removed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card flex max-h-[80vh] w-full max-w-2xl flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-deep-ink">{title}</h2>
          <button onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs">
            Close
          </button>
        </div>
        <div className="overflow-auto rounded border border-ink/10 bg-white p-3 font-mono text-xs leading-relaxed">
          {unchanged ? (
            <p className="text-ink/50">No text differences.</p>
          ) : (
            parts.map((part, i) => (
              <pre
                key={i}
                className={
                  part.added
                    ? "whitespace-pre-wrap bg-spark-lime/10 text-spark-lime"
                    : part.removed
                      ? "whitespace-pre-wrap bg-flag-red/10 text-flag-red line-through"
                      : "whitespace-pre-wrap text-ink/70"
                }
              >
                {part.value.replace(/\n$/, "")}
              </pre>
            ))
          )}
        </div>
        <p className="mt-2 text-[11px] text-ink/40">
          Green lines are in the current document; red lines are only in the saved version.
        </p>
      </div>
    </div>
  );
}
