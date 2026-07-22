"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Bold,
  ChevronDown,
  Copy,
  Image as ImageIcon,
  Italic,
  LayoutTemplate,
  Loader2,
  Lock,
  LockOpen,
  RefreshCw,
  Shapes,
  Smile,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { starPoints } from "@/lib/design/render";
import { EMOJI_GROUPS, FONT_OPTIONS, GRADIENT_PRESETS, SWATCHES, TEMPLATES } from "@/lib/design/presets";
import { fontCss, type DesignDoc, type DesignElement, type DesignPage, type ShapeKind, type TextElement } from "@/lib/design/types";
import { useTemplatePreviews } from "../useTemplatePreviews";

export function ShapeSvg({
  shape,
  w,
  h,
  fill,
  stroke = "none",
  strokeWidth = 0,
  radius = 0,
}: {
  shape: ShapeKind;
  w: number;
  h: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
}) {
  const paint = { fill, stroke, strokeWidth };
  const inset = strokeWidth / 2;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {shape === "rect" && (
        <rect x={inset} y={inset} width={w - strokeWidth} height={h - strokeWidth} rx={radius} {...paint} />
      )}
      {shape === "line" && <rect x={0} y={0} width={w} height={h} rx={h / 2} {...paint} />}
      {shape === "ellipse" && (
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - inset} ry={h / 2 - inset} {...paint} />
      )}
      {shape === "triangle" && <polygon points={`${w / 2},${inset} ${w - inset},${h - inset} ${inset},${h - inset}`} {...paint} />}
      {shape === "star" && (
        <polygon points={starPoints(w, h).map(([px, py]) => `${px},${py}`).join(" ")} {...paint} />
      )}
    </svg>
  );
}

const SHAPES: ShapeKind[] = ["rect", "ellipse", "triangle", "star", "line"];

interface PicsumPhoto {
  id: string;
  author: string;
  width: number;
  height: number;
}

function PhotosPanel({ onInsert }: { onInsert: (src: string, w: number, h: number) => void }) {
  const [photos, setPhotos] = useState<PicsumPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [insertingId, setInsertingId] = useState<string | null>(null);

  async function load(nextPage: number) {
    setStatus("loading");
    try {
      const res = await fetch(`https://picsum.photos/v2/list?page=${nextPage}&limit=24`);
      if (!res.ok) throw new Error(String(res.status));
      const batch = (await res.json()) as PicsumPhoto[];
      setPhotos((prev) => (nextPage === 1 ? batch : [...prev, ...batch]));
      setPage(nextPage);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    load(1);
  }, []);

  async function insert(photo: PicsumPhoto) {
    if (insertingId) return;
    setInsertingId(photo.id);
    try {
      // Fetch a display-sized copy and embed it as a data URL so the design
      // stays fully self-contained (offline exports, IndexedDB persistence).
      const w = Math.min(1600, photo.width);
      const h = Math.round((w / photo.width) * photo.height);
      const blob = await fetch(`https://picsum.photos/id/${photo.id}/${w}/${h}`).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      });
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      onInsert(src, w, h);
    } catch {
      setStatus("error");
    } finally {
      setInsertingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-5 text-ink/40">
        Free stock photos from{" "}
        <a href="https://picsum.photos" target="_blank" rel="noreferrer" className="underline hover:text-node-blue">
          Lorem Picsum
        </a>
        . Click to add — the photo is embedded into your design.
      </p>
      {status === "error" && photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-ink/20 p-4 text-center">
          <p className="text-xs text-ink/50">Couldn&apos;t load photos. Check your connection.</p>
          <button onClick={() => load(1)} className="btn-secondary gap-1.5 px-3 py-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => insert(photo)}
                disabled={insertingId !== null}
                title={`Photo by ${photo.author}`}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border border-ink/10 bg-ink/5 hover:border-node-blue/50 disabled:cursor-wait"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/id/${photo.id}/240/180`}
                  alt={`Stock photo by ${photo.author}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {insertingId === photo.id && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(page + 1)}
            disabled={status === "loading"}
            className="btn-secondary w-full gap-1.5 py-2 text-xs"
          >
            {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {status === "loading" ? "Loading…" : "Load more"}
          </button>
        </>
      )}
    </div>
  );
}

function TemplatesRailPanel({ onApply }: { onApply: (build: () => DesignDoc) => void }) {
  const previews = useTemplatePreviews();
  const [query, setQuery] = useState("");
  const shown = TEMPLATES.filter((t) => t.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search templates"
        className="w-full rounded-lg border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-node-blue focus:bg-white"
      />
      <p className="text-xs leading-5 text-ink/40">Applies to the current page, scaled to fit your canvas.</p>
      <div className="flex flex-col gap-2">
        {shown.map((t) => (
          <button
            key={t.id}
            onClick={() => onApply(t.build)}
            className="card group overflow-hidden text-left transition hover:border-node-blue/40"
          >
            <div className="flex h-24 items-center justify-center bg-ink/5 p-2">
              {previews[t.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[t.id]} alt={t.label} className="max-h-full max-w-full rounded shadow-sm" />
              ) : (
                <span className="text-xs text-ink/30">Preview…</span>
              )}
            </div>
            <p className="px-2.5 py-1.5 text-xs font-medium text-deep-ink group-hover:text-node-blue">{t.label}</p>
          </button>
        ))}
        {shown.length === 0 && <p className="text-xs text-ink/40">No templates match “{query}”.</p>}
      </div>
    </div>
  );
}

export type RailTab = "templates" | "text" | "shapes" | "photos" | "graphics" | "uploads";

const RAIL_TABS: { id: RailTab; label: string; Icon: typeof Type }[] = [
  { id: "templates", label: "Design", Icon: LayoutTemplate },
  { id: "text", label: "Text", Icon: Type },
  { id: "shapes", label: "Shapes", Icon: Shapes },
  { id: "photos", label: "Photos", Icon: ImageIcon },
  { id: "graphics", label: "Graphics", Icon: Smile },
  { id: "uploads", label: "Uploads", Icon: Upload },
];

export function LeftRail({
  onAddText,
  onAddShape,
  onAddImage,
  onAddEmoji,
  onInsertStockPhoto,
  onApplyTemplate,
}: {
  onAddText: (preset: "heading" | "subheading" | "body") => void;
  onAddShape: (shape: ShapeKind) => void;
  onAddImage: (file: File) => void;
  onAddEmoji: (emoji: string) => void;
  onInsertStockPhoto: (src: string, w: number, h: number) => void;
  onApplyTemplate: (build: () => DesignDoc) => void;
}) {
  const [tab, setTab] = useState<RailTab>("text");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="hidden shrink-0 border-r border-ink/10 bg-white md:flex">
      <div className="flex w-16 flex-col gap-1 border-r border-ink/10 p-2">
        {RAIL_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-label={label}
            aria-pressed={tab === id}
            className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition ${
              tab === id ? "bg-node-blue/10 text-node-blue" : "text-ink/50 hover:bg-surface hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="w-60 overflow-y-auto p-4">
        {tab === "templates" && <TemplatesRailPanel onApply={onApplyTemplate} />}

        {tab === "text" && (
          <div className="flex flex-col gap-1.5">
            <button onClick={() => onAddText("heading")} className="rounded-lg border border-ink/10 px-3 py-2 text-left font-display text-lg font-bold text-ink hover:border-node-blue/40 hover:text-node-blue">
              Add a heading
            </button>
            <button onClick={() => onAddText("subheading")} className="rounded-lg border border-ink/10 px-3 py-2 text-left font-display text-sm font-semibold text-ink hover:border-node-blue/40 hover:text-node-blue">
              Add a subheading
            </button>
            <button onClick={() => onAddText("body")} className="rounded-lg border border-ink/10 px-3 py-2 text-left text-xs text-ink hover:border-node-blue/40 hover:text-node-blue">
              Add body text
            </button>
          </div>
        )}

        {tab === "shapes" && (
          <div className="grid grid-cols-3 gap-2">
            {SHAPES.map((shape) => (
              <button
                key={shape}
                onClick={() => onAddShape(shape)}
                aria-label={`Add ${shape}`}
                className="flex h-14 items-center justify-center rounded-lg border border-ink/10 p-2.5 hover:border-node-blue/40"
              >
                <div className={shape === "line" ? "h-1.5 w-full self-center" : "h-full w-full"}>
                  <ShapeSvg shape={shape} w={40} h={shape === "line" ? 6 : 40} fill="rgb(var(--color-ink) / 0.55)" />
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "photos" && <PhotosPanel onInsert={onInsertStockPhoto} />}

        {tab === "graphics" && (
          <div className="flex flex-col gap-4">
            {EMOJI_GROUPS.map((group) => (
              <section key={group.label}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">{group.label}</p>
                <div className="grid grid-cols-5 gap-1">
                  {group.items.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onAddEmoji(emoji)}
                      aria-label={`Add ${emoji} sticker`}
                      className="flex h-9 items-center justify-center rounded-lg text-xl hover:bg-surface"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === "uploads" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink/20 px-3 py-6 text-sm text-ink/60 hover:border-node-blue/50 hover:text-node-blue"
            >
              <Upload className="h-4 w-4" /> Upload image
            </button>
            <p className="text-xs leading-5 text-ink/40">
              PNG, JPEG, WebP or SVG. Images are embedded into the design and never leave your device.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAddImage(file);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-ink/60">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  width = "w-20",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  width?: string;
}) {
  return (
    <input
      type="number"
      value={Math.round(value * 100) / 100}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (!Number.isNaN(v)) onChange(v);
      }}
      className={`${width} rounded-md border border-ink/15 bg-surface px-2 py-1 text-right text-xs text-ink outline-none focus:border-node-blue`}
    />
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}/i.test(value) ? value.slice(0, 7) : "#000000";
  return (
    <div>
      <p className="mb-1.5 text-xs text-ink/60">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            aria-label={`${label} ${c}`}
            onClick={() => onChange(c)}
            className={`h-5 w-5 rounded-full border ${value === c ? "border-node-blue ring-2 ring-node-blue/30" : "border-ink/15"}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} custom color`}
          className="h-6 w-8 cursor-pointer rounded border border-ink/15 bg-transparent p-0"
        />
      </div>
    </div>
  );
}

function FontPicker({ value, onChange }: { value: string; onChange: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = FONT_OPTIONS.find((f) => f.value === value) ?? FONT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Font family"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md border border-ink/15 bg-surface px-2.5 py-1.5 text-sm text-ink outline-none hover:border-node-blue/40"
        style={{ fontFamily: fontCss(current.value) }}
      >
        {current.label}
        <ChevronDown className="h-3.5 w-3.5 text-ink/40" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-ink/10 bg-white p-1 shadow-lg">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.value}
              onClick={() => {
                onChange(font.value);
                setOpen(false);
              }}
              className={`block w-full rounded-md px-2.5 py-1.5 text-left text-base ${
                font.value === value ? "bg-node-blue/10 text-node-blue" : "text-ink/80 hover:bg-surface"
              }`}
              style={{ fontFamily: fontCss(font.value) }}
            >
              {font.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GradientDot({ from, to, angle, active, onClick, label }: { from: string; to: string; angle: number; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`h-6 w-6 rounded-full border ${active ? "border-node-blue ring-2 ring-node-blue/30" : "border-ink/15"}`}
      style={{ background: `linear-gradient(${angle}deg, ${from}, ${to})` }}
    />
  );
}

function IconBtn({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md border text-ink/70 transition ${
        active ? "border-node-blue bg-node-blue/10 text-node-blue" : "border-ink/10 hover:border-node-blue/40"
      }`}
    >
      {children}
    </button>
  );
}

export type LayerAction = "front" | "forward" | "backward" | "back";

export function PropertiesPanel({
  doc,
  page,
  selected,
  onUpdate,
  onLayer,
  onDuplicate,
  onDelete,
  onBackground,
  onGradient,
  onCanvasSize,
}: {
  doc: DesignDoc;
  page: DesignPage;
  selected: DesignElement | null;
  onUpdate: (patch: Partial<DesignElement>) => void;
  onLayer: (action: LayerAction) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBackground: (color: string) => void;
  onGradient: (gradient: { to: string; angle: number } | null) => void;
  onCanvasSize: (width: number, height: number) => void;
}) {
  if (!selected) {
    const gradient = page.backgroundGradient ?? null;
    return (
      <aside className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-l border-ink/10 bg-white p-4 lg:flex">
        <p className="text-sm font-semibold text-deep-ink">Canvas</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="W">
            <NumInput value={doc.width} min={50} max={8000} onChange={(v) => onCanvasSize(Math.max(50, Math.min(8000, v)), doc.height)} width="w-16" />
          </Field>
          <Field label="H">
            <NumInput value={doc.height} min={50} max={8000} onChange={(v) => onCanvasSize(doc.width, Math.max(50, Math.min(8000, v)))} width="w-16" />
          </Field>
        </div>
        <ColorField label={gradient ? "Background (gradient start)" : "Background"} value={page.background} onChange={onBackground} />
        <div>
          <p className="mb-1.5 text-xs text-ink/60">Gradient</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {GRADIENT_PRESETS.map((g) => (
              <GradientDot
                key={`${g.from}-${g.to}`}
                {...g}
                label={`Gradient ${g.from} to ${g.to}`}
                active={Boolean(gradient) && page.background === g.from && gradient?.to === g.to}
                onClick={() => {
                  onBackground(g.from);
                  onGradient({ to: g.to, angle: g.angle });
                }}
              />
            ))}
          </div>
          {gradient && (
            <div className="mt-3 flex flex-col gap-3">
              <ColorField label="Gradient end" value={gradient.to} onChange={(to) => onGradient({ ...gradient, to })} />
              <Field label="Angle">
                <NumInput value={gradient.angle} min={0} max={360} step={15} onChange={(angle) => onGradient({ ...gradient, angle })} />
              </Field>
              <button onClick={() => onGradient(null)} className="btn-secondary w-full py-1.5 text-xs">
                Remove gradient
              </button>
            </div>
          )}
        </div>
        <p className="text-xs leading-5 text-ink/40">
          Select an element to edit it. Double-click text to type. Everything stays on this device.
        </p>
      </aside>
    );
  }

  const patch = onUpdate as (p: Record<string, unknown>) => void;

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-4 overflow-y-auto border-l border-ink/10 bg-white p-4 lg:flex">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold capitalize text-deep-ink">
          {selected.type === "shape" ? selected.shape : selected.type}
        </p>
        <div className="flex gap-1.5">
          <IconBtn label={selected.locked ? "Unlock" : "Lock"} active={selected.locked} onClick={() => patch({ locked: !selected.locked })}>
            {selected.locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
          </IconBtn>
          <IconBtn label="Duplicate" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Delete" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      {selected.type === "text" && (
        <>
          <FontPicker value={selected.font} onChange={(font) => patch({ font })} />
          <Field label="Size">
            <NumInput value={selected.fontSize} min={6} max={800} onChange={(v) => patch({ fontSize: Math.max(6, v) })} />
          </Field>
          <div className="flex gap-1.5">
            <IconBtn label="Bold" active={selected.bold} onClick={() => patch({ bold: !selected.bold })}>
              <Bold className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Italic" active={selected.italic} onClick={() => patch({ italic: !selected.italic })}>
              <Italic className="h-4 w-4" />
            </IconBtn>
            <span className="mx-1 w-px bg-ink/10" />
            {(["left", "center", "right"] as const).map((a) => (
              <IconBtn key={a} label={`Align ${a}`} active={selected.align === a} onClick={() => patch({ align: a })}>
                {a === "left" ? <AlignLeft className="h-4 w-4" /> : a === "center" ? <AlignCenter className="h-4 w-4" /> : <AlignRight className="h-4 w-4" />}
              </IconBtn>
            ))}
          </div>
          <Field label="Line height">
            <NumInput value={selected.lineHeight} min={0.7} max={3} step={0.1} onChange={(v) => patch({ lineHeight: v })} />
          </Field>
          <ColorField label="Color" value={selected.color} onChange={(c) => patch({ color: c })} />
        </>
      )}

      {selected.type === "shape" && (
        <>
          <ColorField label="Fill" value={selected.fill} onChange={(c) => patch({ fill: c })} />
          <ColorField label="Border" value={selected.stroke} onChange={(c) => patch({ stroke: c, strokeWidth: selected.strokeWidth || 4 })} />
          <Field label="Border width">
            <NumInput value={selected.strokeWidth} min={0} max={100} onChange={(v) => patch({ strokeWidth: Math.max(0, v) })} />
          </Field>
          {selected.shape === "rect" && (
            <Field label="Corner radius">
              <NumInput value={selected.radius} min={0} max={500} onChange={(v) => patch({ radius: Math.max(0, v) })} />
            </Field>
          )}
        </>
      )}

      {selected.type === "image" && (
        <Field label="Corner radius">
          <NumInput value={selected.radius} min={0} max={500} onChange={(v) => patch({ radius: Math.max(0, v) })} />
        </Field>
      )}

      <Field label="Opacity">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(selected.opacity * 100)}
            onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })}
            className="w-24 accent-node-blue"
          />
          <span className="w-8 text-right text-xs text-ink/80">{Math.round(selected.opacity * 100)}</span>
        </div>
      </Field>

      <Field label="Rotation">
        <NumInput value={selected.rotation} min={-360} max={360} onChange={(v) => patch({ rotation: v })} />
      </Field>

      <div>
        <p className="mb-1.5 text-xs text-ink/60">Align to canvas</p>
        <div className="flex gap-1.5">
          <IconBtn label="Align left" onClick={() => patch({ x: 0 })}>
            <AlignStartVertical className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Center horizontally" onClick={() => patch({ x: (doc.width - selected.w) / 2 })}>
            <AlignCenterVertical className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Align right" onClick={() => patch({ x: doc.width - selected.w })}>
            <AlignEndVertical className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Align top" onClick={() => patch({ y: 0 })}>
            <AlignStartHorizontal className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Center vertically" onClick={() => patch({ y: (doc.height - selected.h) / 2 })}>
            <AlignCenterHorizontal className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Align bottom" onClick={() => patch({ y: doc.height - selected.h })}>
            <AlignEndHorizontal className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="X"><NumInput value={selected.x} onChange={(v) => patch({ x: v })} width="w-16" /></Field>
        <Field label="Y"><NumInput value={selected.y} onChange={(v) => patch({ y: v })} width="w-16" /></Field>
        <Field label="W"><NumInput value={selected.w} min={1} onChange={(v) => patch({ w: Math.max(1, v) })} width="w-16" /></Field>
        <Field label="H"><NumInput value={selected.h} min={1} onChange={(v) => patch({ h: Math.max(1, v) })} width="w-16" /></Field>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-ink/60">Layer</p>
        <div className="flex gap-1.5">
          <IconBtn label="Send to back" onClick={() => onLayer("back")}><ArrowDownToLine className="h-4 w-4" /></IconBtn>
          <IconBtn label="Move backward" onClick={() => onLayer("backward")}><ArrowDown className="h-4 w-4" /></IconBtn>
          <IconBtn label="Move forward" onClick={() => onLayer("forward")}><ArrowUp className="h-4 w-4" /></IconBtn>
          <IconBtn label="Bring to front" onClick={() => onLayer("front")}><ArrowUpToLine className="h-4 w-4" /></IconBtn>
        </div>
      </div>
    </aside>
  );
}

/** Text presets used by the left rail. */
export function textPreset(doc: DesignDoc, preset: "heading" | "subheading" | "body"): Partial<TextElement> {
  const base = Math.round(doc.width / 15);
  if (preset === "heading") return { text: "Add a heading", fontSize: base, bold: true };
  if (preset === "subheading") return { text: "Add a subheading", fontSize: Math.round(base * 0.55), font: "body" };
  return { text: "Add a little bit of body text", fontSize: Math.round(base * 0.35), font: "body" };
}
