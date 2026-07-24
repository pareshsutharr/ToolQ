"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";

type XLSXModule = typeof import("xlsx");
type Delimiter = "," | ";" | "\t" | "|";
type ParsedRow = unknown[];

const DELIMITER_OPTIONS: { label: string; value: Delimiter }[] = [
  { label: "Comma (,)", value: "," },
  { label: "Semicolon (;)", value: ";" },
  { label: "Tab", value: "\t" },
  { label: "Pipe (|)", value: "|" },
];

interface FileEntry {
  id: string;
  file: File;
  text: string;
  delimiter: "auto" | Delimiter;
  readError: string | null;
}

interface ParsedEntry {
  rows: ParsedRow[];
  delimiter: Delimiter;
  error: string | null;
}

let nextId = 0;

function detectDelimiter(text: string): Delimiter {
  const firstLine = text.split(/\r\n|\r|\n/).find((line) => line.trim().length > 0) ?? "";
  const candidates: Delimiter[] = [",", ";", "\t", "|"];
  let best: Delimiter = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

function sanitizeSheetName(rawName: string, taken: Set<string>): string {
  let base = rawName
    .replace(/\.\w+$/, "")
    .replace(/[:\\/?*[\]]/g, " ")
    .trim()
    .slice(0, 31);
  if (!base) base = "Sheet";
  let candidate = base;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    candidate = base.slice(0, Math.max(0, 31 - suffix.length)) + suffix;
    n++;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

function formatPreviewCell(cell: unknown): string {
  if (cell === null || cell === undefined || cell === "") return "";
  if (cell instanceof Date) return cell.toLocaleDateString();
  return String(cell);
}

export default function CsvToExcelPage() {
  const [XLSXMod, setXLSXMod] = useState<XLSXModule | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [firstRowHeader, setFirstRowHeader] = useState(true);
  const [skipEmptyRows, setSkipEmptyRows] = useState(true);
  const [keepAsText, setKeepAsText] = useState(false);
  const [outputMode, setOutputMode] = useState<"combined" | "separate">("combined");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultFile[] | null>(null);

  useEffect(() => {
    import("xlsx").then(setXLSXMod);
  }, []);

  async function addFiles(files: File[]) {
    setError(null);
    setResults(null);
    const added = await Promise.all(
      files.map(async (file): Promise<FileEntry> => {
        const id = String(nextId++);
        try {
          const buffer = await file.arrayBuffer();
          let text = new TextDecoder("utf-8").decode(buffer);
          if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
          if (text.trim().length === 0) {
            return { id, file, text: "", delimiter: "auto", readError: "This file is empty." };
          }
          return { id, file, text, delimiter: "auto", readError: null };
        } catch {
          return { id, file, text: "", delimiter: "auto", readError: "Couldn't read this file." };
        }
      }),
    );
    setEntries((prev) => [...prev, ...added]);
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function setEntryDelimiter(id: string, delimiter: "auto" | Delimiter) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, delimiter } : e)));
  }

  const parsed = useMemo(() => {
    const map = new Map<string, ParsedEntry>();
    if (!XLSXMod) return map;
    for (const entry of entries) {
      if (entry.readError) {
        map.set(entry.id, { rows: [], delimiter: ",", error: entry.readError });
        continue;
      }
      const delimiter = entry.delimiter === "auto" ? detectDelimiter(entry.text) : entry.delimiter;
      try {
        const wb = XLSXMod.read(entry.text, { type: "string", FS: delimiter, raw: keepAsText });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        let rows = XLSXMod.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          blankrows: true,
        }) as ParsedRow[];
        if (skipEmptyRows) {
          rows = rows.filter((row) => row.some((cell) => cell !== "" && cell !== null && cell !== undefined));
        }
        if (rows.length === 0) {
          map.set(entry.id, { rows: [], delimiter, error: "No data found in this file." });
        } else {
          map.set(entry.id, { rows, delimiter, error: null });
        }
      } catch {
        map.set(entry.id, { rows: [], delimiter, error: "Couldn't parse this file as CSV." });
      }
    }
    return map;
  }, [XLSXMod, entries, keepAsText, skipEmptyRows]);

  const validEntries = entries.filter((e) => {
    const info = parsed.get(e.id);
    return info && !info.error;
  });
  const hasErrorEntries = entries.some((e) => parsed.get(e.id)?.error);

  function buildSheet(XLSX: XLSXModule, rows: ParsedRow[]) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const colCount = Math.max(1, ...rows.map((r) => r.length));
    ws["!cols"] = Array.from({ length: colCount }, (_, c) => {
      let max = 8;
      for (const row of rows) {
        const len = formatPreviewCell(row[c]).length;
        if (len > max) max = len;
      }
      return { wch: Math.min(max + 2, 40) };
    });
    if (firstRowHeader) {
      ws["!autofilter"] = {
        ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: colCount - 1 } }),
      };
    }
    return ws;
  }

  async function convert() {
    if (!XLSXMod || validEntries.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const XLSX = XLSXMod;
      if (outputMode === "combined" || validEntries.length === 1) {
        const wb = XLSX.utils.book_new();
        const taken = new Set<string>();
        for (const entry of validEntries) {
          const info = parsed.get(entry.id);
          if (!info) continue;
          const ws = buildSheet(XLSX, info.rows);
          XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(entry.file.name, taken));
        }
        const outBytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([outBytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const baseName =
          validEntries.length === 1 ? validEntries[0].file.name.replace(/\.\w+$/, "") : "converted";
        setResults([{ name: `${baseName}.xlsx`, url: URL.createObjectURL(blob), size: blob.size }]);
      } else {
        const files: ResultFile[] = [];
        for (const entry of validEntries) {
          const info = parsed.get(entry.id);
          if (!info) continue;
          const wb = XLSX.utils.book_new();
          const ws = buildSheet(XLSX, info.rows);
          XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(entry.file.name, new Set()));
          const outBytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
          const blob = new Blob([outBytes], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          files.push({
            name: entry.file.name.replace(/\.\w+$/, "") + ".xlsx",
            url: URL.createObjectURL(blob),
            size: blob.size,
          });
        }
        setResults(files);
      }
    } catch {
      setError("Couldn't convert one or more files — try adjusting the delimiter for the file in question.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setEntries([]);
    setResults(null);
    setError(null);
  }

  return (
    <ToolShell
      title="CSV to Excel"
      description="Convert one or more CSV files into a formatted, ready-to-use Excel workbook."
    >
      {results ? (
        <ResultList files={results} onReset={reset} zipName="csv-to-excel.zip" />
      ) : (
        <div className="flex flex-col gap-5">
          <Dropzone
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            multiple
            onFiles={addFiles}
            label="Drop CSV files here or click to browse"
          />

          {entries.length > 0 && (
            <ul className="card divide-y divide-ink/10">
              {entries.map((entry) => {
                const info = parsed.get(entry.id);
                const rows = info?.rows ?? [];
                const previewRows = rows.slice(0, 5);
                const colCount = Math.max(0, ...rows.map((r) => r.length));
                return (
                  <li key={entry.id} className="flex flex-col gap-2 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink/80">{entry.file.name}</p>
                        {info?.error ? (
                          <p className="text-xs text-flag-red">{info.error}</p>
                        ) : (
                          <p className="text-xs text-ink/40">
                            {rows.length} rows × {colCount} columns
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <select
                          value={entry.delimiter}
                          onChange={(e) => setEntryDelimiter(entry.id, e.target.value as "auto" | Delimiter)}
                          className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs"
                          aria-label={`Delimiter for ${entry.file.name}`}
                        >
                          <option value="auto">Auto-detect</option>
                          {DELIMITER_OPTIONS.map((d) => (
                            <option key={d.label} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="text-xs font-semibold text-ink/40 hover:text-flag-red"
                          aria-label={`Remove ${entry.file.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {!info?.error && previewRows.length > 0 && (
                      <div className="overflow-x-auto rounded-lg border border-ink/10">
                        <table className="w-full text-left text-xs">
                          <tbody>
                            {previewRows.map((row, ri) => (
                              <tr key={ri} className={ri === 0 && firstRowHeader ? "bg-surface font-semibold" : ""}>
                                {row.slice(0, 8).map((cell, ci) => (
                                  <td
                                    key={ci}
                                    className="max-w-[140px] truncate border-b border-ink/5 px-2 py-1"
                                  >
                                    {formatPreviewCell(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {entries.length > 0 && (
            <div className="card flex flex-col gap-3 p-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={firstRowHeader}
                  onChange={(e) => setFirstRowHeader(e.target.checked)}
                />
                First row is a header (adds column filters)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={skipEmptyRows}
                  onChange={(e) => setSkipEmptyRows(e.target.checked)}
                />
                Skip fully empty rows
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={keepAsText} onChange={(e) => setKeepAsText(e.target.checked)} />
                Keep everything as text (stops Excel reinterpreting leading zeros, IDs or dates)
              </label>

              {validEntries.length > 1 && (
                <div className="flex flex-col gap-2 border-t border-ink/10 pt-3">
                  <span className="text-xs font-medium text-ink/60">Output</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="outputMode"
                      checked={outputMode === "combined"}
                      onChange={() => setOutputMode("combined")}
                    />
                    One workbook — each file becomes its own sheet
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="outputMode"
                      checked={outputMode === "separate"}
                      onChange={() => setOutputMode("separate")}
                    />
                    Separate .xlsx file per CSV
                  </label>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-flag-red">{error}</p>}
          {!error && hasErrorEntries && (
            <p className="text-xs text-amber">Files with errors above will be skipped when converting.</p>
          )}

          {entries.length > 0 && (
            <button
              onClick={convert}
              disabled={busy || !XLSXMod || validEntries.length === 0}
              className="btn-primary gap-2"
            >
              {(busy || !XLSXMod) && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy
                ? "Converting…"
                : !XLSXMod
                  ? "Loading…"
                  : validEntries.length > 1
                    ? `Convert ${validEntries.length} files to Excel`
                    : "Convert to Excel"}
            </button>
          )}
        </div>
      )}
    </ToolShell>
  );
}
