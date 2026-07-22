"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  Copy,
  CreditCard,
  FileImage,
  Globe,
  Plus,
  Presentation,
  Search,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { FaInstagram, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { SIZE_PRESETS, TEMPLATES } from "@/lib/design/presets";
import { createDesign, uid, type DesignDoc } from "@/lib/design/types";
import { deleteDesign, listDesigns, saveDesign } from "@/lib/design/storage";
import { useTemplatePreviews } from "./useTemplatePreviews";

function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString();
}

const PRESET_ICONS: Record<string, { Icon: ComponentType<{ className?: string }>; color: string }> = {
  "ig-post": { Icon: FaInstagram, color: "#E1306C" },
  "ig-story": { Icon: Smartphone, color: "#8b5cf6" },
  "yt-thumb": { Icon: FaYoutube, color: "#FF0000" },
  presentation: { Icon: Presentation, color: "#f59e0b" },
  poster: { Icon: FileImage, color: "#10b981" },
  banner: { Icon: FaXTwitter, color: "#111827" },
  "business-card": { Icon: CreditCard, color: "#4f46e5" },
  "og-image": { Icon: Globe, color: "#0891b2" },
};

function CustomSizeModal({ onCreate, onClose }: { onCreate: (w: number, h: number) => void; onClose: () => void }) {
  const [w, setW] = useState(1080);
  const [h, setH] = useState(1080);
  const valid = w >= 50 && w <= 8000 && h >= 50 && h <= 8000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-lg font-semibold text-deep-ink">Custom size</p>
          <button onClick={onClose} aria-label="Close" className="text-ink/40 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex-1 text-xs text-ink/60">
            Width (px)
            <input
              type="number"
              min={50}
              max={8000}
              value={w}
              onChange={(e) => setW(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-node-blue"
            />
          </label>
          <span className="pb-2 text-ink/40">×</span>
          <label className="flex-1 text-xs text-ink/60">
            Height (px)
            <input
              type="number"
              min={50}
              max={8000}
              value={h}
              onChange={(e) => setH(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-node-blue"
            />
          </label>
        </div>
        {!valid && <p className="mt-2 text-xs text-flag-red">Sizes must be between 50 and 8000 pixels.</p>}
        <button onClick={() => valid && onCreate(w, h)} disabled={!valid} className="btn-primary mt-5 w-full">
          Create design
        </button>
      </div>
    </div>
  );
}

export default function GalleryClient() {
  const router = useRouter();
  const [designs, setDesigns] = useState<DesignDoc[] | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [query, setQuery] = useState("");
  const previews = useTemplatePreviews();

  useEffect(() => {
    listDesigns().then(setDesigns).catch(() => setDesigns([]));
  }, []);

  async function open(doc: DesignDoc) {
    await saveDesign(doc);
    router.push(`/design/${doc.id}`);
  }

  async function duplicate(doc: DesignDoc) {
    const copy: DesignDoc = { ...doc, id: uid(), name: `${doc.name} copy`, createdAt: Date.now(), updatedAt: Date.now() };
    await saveDesign(copy);
    setDesigns((d) => (d ? [copy, ...d] : [copy]));
  }

  async function remove(doc: DesignDoc) {
    if (!window.confirm(`Delete "${doc.name}"? This can't be undone.`)) return;
    await deleteDesign(doc.id);
    setDesigns((d) => (d ? d.filter((item) => item.id !== doc.id) : d));
  }

  const q = query.trim().toLowerCase();
  const shownTemplates = TEMPLATES.filter((t) => !q || t.label.toLowerCase().includes(q));
  const shownDesigns = (designs ?? []).filter((d) => !q || d.name.toLowerCase().includes(q));

  return (
    <div className="pb-16">
      <section className="bg-gradient-to-r from-node-blue via-[#7c5cf0] to-signal-violet px-6 py-14 text-center">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">What will you design today?</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/80">
          Free drag-and-drop editor for social posts, thumbnails, posters and cards — everything stays on your device.
        </p>
        <div className="relative mx-auto mt-6 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates and your designs"
            className="w-full rounded-full border border-white/20 bg-white py-3 pl-11 pr-4 text-sm text-deep-ink shadow-lg outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-white/60"
          />
        </div>

        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-start justify-center gap-x-5 gap-y-4">
          {SIZE_PRESETS.map((preset) => {
            const meta = PRESET_ICONS[preset.id] ?? { Icon: FileImage, color: "#64748b" };
            return (
              <button
                key={preset.id}
                onClick={() => open(createDesign(preset.label, preset.width, preset.height))}
                title={`${preset.label} · ${preset.hint}`}
                className="group flex w-20 flex-col items-center gap-1.5"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition group-hover:scale-110"
                  style={{ backgroundColor: meta.color }}
                >
                  <meta.Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium leading-tight text-white/90">{preset.label}</span>
              </button>
            );
          })}
          <button onClick={() => setCustomOpen(true)} title="Custom size" className="group flex w-20 flex-col items-center gap-1.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-white/60 text-white transition group-hover:scale-110 group-hover:border-white">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium leading-tight text-white/90">Custom size</span>
          </button>
        </div>
      </section>

      {customOpen && (
        <CustomSizeModal
          onClose={() => setCustomOpen(false)}
          onCreate={(w, h) => {
            setCustomOpen(false);
            open(createDesign(`Custom ${w} × ${h}`, w, h));
          }}
        />
      )}

      <div className="mx-auto max-w-6xl px-6">
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/40">Templates</h2>
          {shownTemplates.length === 0 ? (
            <p className="text-sm text-ink/40">No templates match “{query}”.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {shownTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => open(template.build())}
                  className="card group overflow-hidden text-left transition hover:border-node-blue/40"
                >
                  <div className="flex h-32 items-center justify-center bg-ink/5 p-3">
                    {previews[template.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previews[template.id]} alt={template.label} className="max-h-full max-w-full rounded shadow-sm" />
                    ) : (
                      <span className="text-xs text-ink/30">Preview…</span>
                    )}
                  </div>
                  <p className="px-3 py-2 text-sm font-medium text-deep-ink group-hover:text-node-blue">{template.label}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/40">Recents</h2>
          {designs === null ? (
            <p className="text-sm text-ink/40">Loading…</p>
          ) : shownDesigns.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 border-dashed p-10 text-center">
              <p className="text-sm text-ink/50">
                {q ? `No designs match “${query}”.` : "No designs yet — pick a size or template above to get started."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shownDesigns.map((doc) => (
                <div key={doc.id} className="card group overflow-hidden transition hover:border-node-blue/40">
                  <button
                    onClick={() => router.push(`/design/${doc.id}`)}
                    className="block w-full"
                    aria-label={`Open ${doc.name}`}
                  >
                    <div className="flex h-36 items-center justify-center bg-ink/5 p-3">
                      {doc.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={doc.thumbnail} alt={doc.name} className="max-h-full max-w-full rounded shadow-sm" />
                      ) : (
                        <span className="text-xs text-ink/30">{doc.width} × {doc.height}</span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-deep-ink">{doc.name}</p>
                      <p className="text-xs text-ink/40">
                        {doc.width} × {doc.height}
                        {doc.pages.length > 1 ? ` · ${doc.pages.length} pages` : ""} · {timeAgo(doc.updatedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => duplicate(doc)}
                        aria-label={`Duplicate ${doc.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/10 text-ink/60 hover:border-node-blue/40 hover:text-node-blue"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(doc)}
                        aria-label={`Delete ${doc.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/10 text-ink/60 hover:border-flag-red/50 hover:text-flag-red"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
