"use client";

import { useState } from "react";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultFile } from "@/components/ResultList";
import { Loader2 } from "lucide-react";

type FieldDescriptor =
  | { kind: "text"; name: string }
  | { kind: "checkbox"; name: string }
  | { kind: "choice"; name: string; options: string[] };

export default function FillFormPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FieldDescriptor[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [flatten, setFlatten] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFile | null>(null);

  async function handleFile(files: File[]) {
    setError(null);
    const f = files[0];
    try {
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const form = doc.getForm();
      const descriptors: FieldDescriptor[] = form.getFields().flatMap((field): FieldDescriptor[] => {
        const name = field.getName();
        if (field instanceof PDFCheckBox) return [{ kind: "checkbox", name }];
        if (field instanceof PDFRadioGroup) return [{ kind: "choice", name, options: field.getOptions() }];
        if (field instanceof PDFDropdown) return [{ kind: "choice", name, options: field.getOptions() }];
        if (field instanceof PDFTextField) return [{ kind: "text", name }];
        return [];
      });
      if (descriptors.length === 0) {
        setError("This PDF doesn't have any fillable form fields.");
        return;
      }
      setFields(descriptors);
      setFile(f);
    } catch {
      setError("That doesn't look like a valid PDF.");
    }
  }

  function setValue(name: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const form = doc.getForm();
      for (const descriptor of fields) {
        const value = values[descriptor.name];
        if (value === undefined) continue;
        if (descriptor.kind === "text") {
          form.getTextField(descriptor.name).setText(String(value));
        } else if (descriptor.kind === "checkbox") {
          const box = form.getCheckBox(descriptor.name);
          if (value) box.check();
          else box.uncheck();
        } else {
          try {
            form.getRadioGroup(descriptor.name).select(String(value));
          } catch {
            form.getDropdown(descriptor.name).select(String(value));
          }
        }
      }
      if (flatten) form.flatten();
      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      setResult({ name: "filled.pdf", url: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setError("Couldn't fill this form.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setFields([]);
    setValues({});
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell title="Fill PDF Form" description="Fill in an interactive PDF form's fields.">
      {result ? (
        <ResultList files={[result]} onReset={reset} />
      ) : !file ? (
        <Dropzone accept="application/pdf" onFiles={handleFile} label="Drop a fillable PDF here or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">
            {file.name} — {fields.length} fields
          </p>
          <div className="card flex flex-col gap-3 p-4">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="mb-1 block text-sm font-medium text-ink/70">{f.name}</label>
                {f.kind === "text" && (
                  <input
                    type="text"
                    value={(values[f.name] as string) ?? ""}
                    onChange={(e) => setValue(f.name, e.target.value)}
                    className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
                  />
                )}
                {f.kind === "checkbox" && (
                  <input
                    type="checkbox"
                    checked={Boolean(values[f.name])}
                    onChange={(e) => setValue(f.name, e.target.checked)}
                    className="h-4 w-4"
                  />
                )}
                {f.kind === "choice" && (
                  <select
                    value={(values[f.name] as string) ?? ""}
                    onChange={(e) => setValue(f.name, e.target.value)}
                    className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
                  >
                    <option value="">Choose…</option>
                    {f.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} />
            Flatten form (values become permanent, no longer editable)
          </label>
          {error && <p className="text-sm text-flag-red">{error}</p>}
          <button onClick={submit} disabled={busy} className="btn-primary gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Filling…" : "Fill Form"}
          </button>
        </div>
      )}
    </ToolShell>
  );
}
