"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Maximize,
  Minus,
  Plus,
  Redo2,
  RotateCw,
  Ruler,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  backgroundCss,
  createImage,
  createPage,
  createShape,
  createText,
  ensureFontStylesheet,
  fontCss,
  uid,
  type DesignDoc,
  type DesignElement,
  type DesignPage,
  type ShapeKind,
} from "@/lib/design/types";
import { SIZE_PRESETS } from "@/lib/design/presets";
import { getDesign, saveDesign } from "@/lib/design/storage";
import { exportPdf, exportRaster, makeThumbnail } from "@/lib/design/render";
import { LeftRail, PropertiesPanel, ShapeSvg, textPreset, type LayerAction } from "./panels";

const MIN_SIZE = 10;
const STAGE_PAD = 48;

type Snapshot = Pick<DesignDoc, "pages" | "width" | "height">;
type DragMode = { kind: "move" } | { kind: "resize"; hx: -1 | 0 | 1; hy: -1 | 0 | 1 } | { kind: "rotate" };

const HANDLES: { hx: -1 | 0 | 1; hy: -1 | 0 | 1; cursor: string }[] = [
  { hx: -1, hy: -1, cursor: "nwse-resize" },
  { hx: 0, hy: -1, cursor: "ns-resize" },
  { hx: 1, hy: -1, cursor: "nesw-resize" },
  { hx: 1, hy: 0, cursor: "ew-resize" },
  { hx: 1, hy: 1, cursor: "nwse-resize" },
  { hx: 0, hy: 1, cursor: "ns-resize" },
  { hx: -1, hy: 1, cursor: "nesw-resize" },
  { hx: -1, hy: 0, cursor: "ew-resize" },
];

const ROTATION_SNAPS = [0, 45, 90, 135, 180, -45, -90, -135, -180];

function snapshotOf(doc: DesignDoc): Snapshot {
  return { pages: doc.pages, width: doc.width, height: doc.height };
}

function withPage(doc: DesignDoc, index: number, fn: (p: DesignPage) => DesignPage): DesignDoc {
  return { ...doc, pages: doc.pages.map((p, i) => (i === index ? fn(p) : p)) };
}

/** Uniformly scales and offsets an element (template apply, canvas resize). */
function scaleElement(el: DesignElement, s: number, ox: number, oy: number): DesignElement {
  const base = { ...el, x: el.x * s + ox, y: el.y * s + oy, w: el.w * s, h: el.h * s };
  if (base.type === "text") return { ...base, fontSize: Math.max(4, base.fontSize * s) };
  if (base.type === "shape") return { ...base, strokeWidth: base.strokeWidth * s, radius: base.radius * s };
  return { ...base, radius: base.radius * s };
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-ink/10 text-ink/70 hover:border-node-blue/40 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ResizePopover({
  doc,
  onResize,
  onClose,
}: {
  doc: DesignDoc;
  onResize: (w: number, h: number, scaleContent: boolean) => void;
  onClose: () => void;
}) {
  const [w, setW] = useState(doc.width);
  const [h, setH] = useState(doc.height);
  const [scaleContent, setScaleContent] = useState(true);
  const valid = w >= 50 && w <= 8000 && h >= 50 && h <= 8000;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-0 top-full z-30 mt-2 w-64 rounded-xl border border-ink/10 bg-white p-3 shadow-lg">
      <div className="mb-2 max-h-44 overflow-y-auto">
        {SIZE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => {
              setW(preset.width);
              setH(preset.height);
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-surface ${
              w === preset.width && h === preset.height ? "text-node-blue" : "text-ink/80"
            }`}
          >
            {preset.label}
            <span className="text-xs text-ink/40">{preset.hint}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-ink/10 pt-3">
        <input
          type="number"
          value={w}
          min={50}
          max={8000}
          aria-label="Canvas width"
          onChange={(e) => setW(Number(e.target.value))}
          className="w-full rounded-md border border-ink/15 bg-surface px-2 py-1.5 text-right text-xs text-ink outline-none focus:border-node-blue"
        />
        <span className="text-ink/40">×</span>
        <input
          type="number"
          value={h}
          min={50}
          max={8000}
          aria-label="Canvas height"
          onChange={(e) => setH(Number(e.target.value))}
          className="w-full rounded-md border border-ink/15 bg-surface px-2 py-1.5 text-right text-xs text-ink outline-none focus:border-node-blue"
        />
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-ink/70">
        <input
          type="checkbox"
          checked={scaleContent}
          onChange={(e) => setScaleContent(e.target.checked)}
          className="accent-node-blue"
        />
        Scale content to fit
      </label>
      <button
        onClick={() => valid && onResize(w, h, scaleContent)}
        disabled={!valid}
        className="btn-primary mt-3 w-full py-2 text-xs"
      >
        Resize design
      </button>
    </div>
  );
}

export default function EditorClient({ id }: { id: string }) {
  const [doc, setDoc] = useState<DesignDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.4);
  const [saved, setSaved] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [guides, setGuides] = useState<{ v: number | null; h: number | null }>({ v: null, h: null });
  const [, setHistoryTick] = useState(0);

  useEffect(() => {
    ensureFontStylesheet();
  }, []);

  const viewportRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<DesignDoc | null>(null);
  docRef.current = doc;
  const pageIdx = doc ? Math.min(pageIndex, doc.pages.length - 1) : 0;
  const pageIdxRef = useRef(0);
  pageIdxRef.current = pageIdx;
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const lastCommit = useRef({ key: "", time: 0 });

  const pushPast = useCallback((snap: Snapshot) => {
    past.current.push(snap);
    if (past.current.length > 60) past.current.shift();
    future.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  /**
   * Applies a change and records history. Rapid changes to the same `key`
   * (slider drags, typing) coalesce into a single undo step.
   */
  const commit = useCallback(
    (key: string, update: (d: DesignDoc) => DesignDoc) => {
      const now = Date.now();
      const coalesce = lastCommit.current.key === key && now - lastCommit.current.time < 800;
      lastCommit.current = { key, time: now };
      setDoc((d) => {
        if (!d) return d;
        if (!coalesce) pushPast(snapshotOf(d));
        return update(d);
      });
    },
    [pushPast],
  );

  /** Commit helper scoped to the active page. */
  const commitPage = useCallback(
    (key: string, update: (p: DesignPage) => DesignPage) => {
      commit(key, (d) => withPage(d, pageIdxRef.current, update));
    },
    [commit],
  );

  const undo = useCallback(() => {
    lastCommit.current = { key: "", time: 0 };
    setDoc((d) => {
      if (!d || past.current.length === 0) return d;
      const prev = past.current.pop()!;
      future.current.push(snapshotOf(d));
      setHistoryTick((t) => t + 1);
      return { ...d, ...prev };
    });
  }, []);

  const redo = useCallback(() => {
    lastCommit.current = { key: "", time: 0 };
    setDoc((d) => {
      if (!d || future.current.length === 0) return d;
      const next = future.current.pop()!;
      past.current.push(snapshotOf(d));
      setHistoryTick((t) => t + 1);
      return { ...d, ...next };
    });
  }, []);

  useEffect(() => {
    getDesign(id)
      .then((d) => (d ? setDoc(d) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [id]);

  const fitZoom = useCallback(() => {
    const viewport = viewportRef.current;
    const d = docRef.current;
    if (!viewport || !d) return;
    const z = Math.min(
      (viewport.clientWidth - STAGE_PAD * 2) / d.width,
      (viewport.clientHeight - STAGE_PAD * 2) / d.height,
      1,
    );
    setZoom(Math.max(0.05, Math.round(z * 100) / 100));
  }, []);

  const loadedId = doc?.id;
  useEffect(() => {
    if (!loadedId) return;
    fitZoom();
    window.addEventListener("resize", fitZoom);
    return () => window.removeEventListener("resize", fitZoom);
  }, [loadedId, fitZoom]);

  // Autosave (debounced) and refresh the gallery thumbnail.
  useEffect(() => {
    if (!doc) return;
    setSaved(false);
    const t = setTimeout(async () => {
      const current = docRef.current;
      if (!current) return;
      const thumbnail = await makeThumbnail(current).catch(() => current.thumbnail);
      await saveDesign({ ...current, thumbnail, updatedAt: Date.now() }).catch(() => {});
      setSaved(true);
    }, 900);
    return () => clearTimeout(t);
  }, [doc]);

  const page = doc?.pages[pageIdx] ?? null;
  const selected = page?.elements.find((el) => el.id === selectedId) ?? null;

  const updateSelected = useCallback(
    (patch: Partial<DesignElement>) => {
      const targetId = selectedId;
      if (!targetId) return;
      commitPage(`patch:${targetId}:${Object.keys(patch).join(",")}`, (p) => ({
        ...p,
        elements: p.elements.map((el) => (el.id === targetId ? ({ ...el, ...patch } as DesignElement) : el)),
      }));
    },
    [commitPage, selectedId],
  );

  const addElement = useCallback(
    (el: DesignElement) => {
      commitPage(`add:${el.id}`, (p) => ({ ...p, elements: [...p.elements, el] }));
      setSelectedId(el.id);
    },
    [commitPage],
  );

  const removeSelected = useCallback(() => {
    const targetId = selectedId;
    if (!targetId) return;
    commitPage(`remove:${targetId}`, (p) => ({ ...p, elements: p.elements.filter((el) => el.id !== targetId) }));
    setSelectedId(null);
    setEditingId(null);
  }, [commitPage, selectedId]);

  const duplicateSelected = useCallback(() => {
    const d = docRef.current;
    const source = d?.pages[pageIdxRef.current]?.elements.find((el) => el.id === selectedId);
    if (!source) return;
    const clone = { ...source, id: uid(), x: source.x + 24, y: source.y + 24, locked: false };
    addElement(clone);
  }, [addElement, selectedId]);

  const reorderSelected = useCallback(
    (action: LayerAction) => {
      const targetId = selectedId;
      if (!targetId) return;
      commitPage(`layer:${targetId}:${action}`, (p) => {
        const index = p.elements.findIndex((el) => el.id === targetId);
        if (index < 0) return p;
        const elements = [...p.elements];
        const [el] = elements.splice(index, 1);
        const to =
          action === "front" ? elements.length : action === "back" ? 0 : action === "forward" ? Math.min(elements.length, index + 1) : Math.max(0, index - 1);
        elements.splice(to, 0, el);
        return { ...p, elements };
      });
    },
    [commitPage, selectedId],
  );

  // --- Page operations -------------------------------------------------

  const selectPage = useCallback((index: number) => {
    setPageIndex(index);
    setSelectedId(null);
    setEditingId(null);
  }, []);

  const addPage = useCallback(() => {
    const at = pageIdxRef.current + 1;
    commit("page-add", (d) => ({ ...d, pages: [...d.pages.slice(0, at), createPage(), ...d.pages.slice(at)] }));
    selectPage(at);
  }, [commit, selectPage]);

  const duplicatePage = useCallback(() => {
    const at = pageIdxRef.current;
    commit("page-duplicate", (d) => {
      const source = d.pages[at];
      const clone: DesignPage = {
        ...source,
        id: uid(),
        elements: source.elements.map((el) => ({ ...el, id: uid() })),
      };
      return { ...d, pages: [...d.pages.slice(0, at + 1), clone, ...d.pages.slice(at + 1)] };
    });
    selectPage(at + 1);
  }, [commit, selectPage]);

  const deletePage = useCallback(() => {
    const at = pageIdxRef.current;
    const d = docRef.current;
    if (!d || d.pages.length <= 1) return;
    commit("page-delete", (cur) => ({ ...cur, pages: cur.pages.filter((_, i) => i !== at) }));
    selectPage(Math.max(0, at - 1));
  }, [commit, selectPage]);

  const movePage = useCallback(
    (dir: -1 | 1) => {
      const at = pageIdxRef.current;
      const d = docRef.current;
      if (!d) return;
      const to = at + dir;
      if (to < 0 || to >= d.pages.length) return;
      commit("page-move", (cur) => {
        const pages = [...cur.pages];
        const [p] = pages.splice(at, 1);
        pages.splice(to, 0, p);
        return { ...cur, pages };
      });
      selectPage(to);
    },
    [commit, selectPage],
  );

  const applyTemplate = useCallback(
    (build: () => DesignDoc) => {
      const template = build();
      const source = template.pages[0];
      commit("template-apply", (d) => {
        const s = Math.min(d.width / template.width, d.height / template.height);
        const ox = (d.width - template.width * s) / 2;
        const oy = (d.height - template.height * s) / 2;
        return withPage(d, pageIdxRef.current, (p) => ({
          ...p,
          background: source.background,
          backgroundGradient: source.backgroundGradient ?? null,
          elements: source.elements.map((el) => scaleElement({ ...el, id: uid() }, s, ox, oy)),
        }));
      });
      setSelectedId(null);
    },
    [commit],
  );

  const resizeDesign = useCallback(
    (w: number, h: number, scaleContent: boolean) => {
      setResizeOpen(false);
      commit("design-resize", (d) => {
        if (!scaleContent) return { ...d, width: w, height: h };
        const s = Math.min(w / d.width, h / d.height);
        const ox = (w - d.width * s) / 2;
        const oy = (h - d.height * s) / 2;
        return {
          ...d,
          width: w,
          height: h,
          pages: d.pages.map((p) => ({ ...p, elements: p.elements.map((el) => scaleElement(el, s, ox, oy)) })),
        };
      });
      setTimeout(fitZoom, 0);
    },
    [commit, fitZoom],
  );

  // Keyboard shortcuts. Handlers live in a ref so the single listener never
  // sees stale state.
  const actions = useRef({ undo, redo, removeSelected, duplicateSelected, updateSelected, selected, editingId });
  actions.current = { undo, redo, removeSelected, duplicateSelected, updateSelected, selected, editingId };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
      const a = actions.current;
      const mod = e.metaKey || e.ctrlKey;

      if (!typing && mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) a.redo();
        else a.undo();
        return;
      }
      if (!typing && mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        a.redo();
        return;
      }
      if (typing) return;
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        a.duplicateSelected();
        return;
      }
      if (e.key === "Escape") {
        setEditingId(null);
        setSelectedId(null);
        return;
      }
      if (!a.selected || a.selected.locked) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        a.removeSelected();
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        a.updateSelected({ x: a.selected.x + dx, y: a.selected.y + dy });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function beginDrag(e: React.PointerEvent, el: DesignElement, mode: DragMode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedId(el.id);
    if (el.locked || editingId === el.id) return;
    e.preventDefault();

    const startPointer = { x: e.clientX, y: e.clientY };
    const start = { ...el };
    const board = artboardRef.current?.getBoundingClientRect();
    const center = board
      ? { x: board.left + (el.x + el.w / 2) * zoom, y: board.top + (el.y + el.h / 2) * zoom }
      : { x: 0, y: 0 };
    const base = docRef.current ? snapshotOf(docRef.current) : null;
    let moved = false;

    const applyTo = (item: DesignElement, ev: PointerEvent): DesignElement => {
      const dx = (ev.clientX - startPointer.x) / zoom;
      const dy = (ev.clientY - startPointer.y) / zoom;

      if (mode.kind === "move") {
        // Snap the element to the canvas center and edges, Canva-style, and
        // surface guide lines while a snap is active.
        let x = Math.round(start.x + dx);
        let y = Math.round(start.y + dy);
        const d = docRef.current;
        let guideV: number | null = null;
        let guideH: number | null = null;
        if (d) {
          const threshold = 6 / zoom;
          if (Math.abs(x + item.w / 2 - d.width / 2) < threshold) {
            x = Math.round(d.width / 2 - item.w / 2);
            guideV = d.width / 2;
          } else if (Math.abs(x) < threshold) {
            x = 0;
            guideV = 0;
          } else if (Math.abs(x + item.w - d.width) < threshold) {
            x = d.width - item.w;
            guideV = d.width;
          }
          if (Math.abs(y + item.h / 2 - d.height / 2) < threshold) {
            y = Math.round(d.height / 2 - item.h / 2);
            guideH = d.height / 2;
          } else if (Math.abs(y) < threshold) {
            y = 0;
            guideH = 0;
          } else if (Math.abs(y + item.h - d.height) < threshold) {
            y = d.height - item.h;
            guideH = d.height;
          }
        }
        setGuides({ v: guideV, h: guideH });
        return { ...item, x, y };
      }

      if (mode.kind === "rotate") {
        const angle = (Math.atan2(ev.clientY - center.y, ev.clientX - center.x) * 180) / Math.PI + 90;
        let deg = ((angle % 360) + 540) % 360 - 180;
        for (const snap of ROTATION_SNAPS) {
          if (Math.abs(deg - snap) < 5) {
            deg = snap;
            break;
          }
        }
        return { ...item, rotation: Math.round(deg) };
      }

      // Resize: convert the pointer delta into the element's rotated axes,
      // grow from the dragged handle and keep the opposite handle fixed.
      const rad = (start.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      const { hx, hy } = mode;

      let newW = hx === 0 ? start.w : start.w + hx * lx;
      let newH = hy === 0 ? start.h : start.h + hy * ly;
      const corner = hx !== 0 && hy !== 0;
      if (corner && (ev.shiftKey || item.type === "image" || item.type === "text")) {
        const scale = Math.max(newW / start.w, newH / start.h);
        newW = start.w * scale;
        newH = start.h * scale;
      }
      newW = Math.max(MIN_SIZE, newW);
      newH = Math.max(MIN_SIZE, newH);

      const cx0 = start.x + start.w / 2;
      const cy0 = start.y + start.h / 2;
      const fx = (-hx * start.w) / 2;
      const fy = (-hy * start.h) / 2;
      const fixedX = cx0 + fx * cos - fy * sin;
      const fixedY = cy0 + fx * sin + fy * cos;
      const ox = (hx * newW) / 2;
      const oy = (hy * newH) / 2;
      const cx1 = fixedX + ox * cos - oy * sin;
      const cy1 = fixedY + ox * sin + oy * cos;

      const next: DesignElement = { ...item, w: newW, h: newH, x: cx1 - newW / 2, y: cy1 - newH / 2 };
      if (next.type === "text" && corner) {
        next.fontSize = Math.max(6, start.type === "text" ? (start.fontSize * newW) / start.w : next.fontSize);
      }
      return next;
    };

    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startPointer.x) + Math.abs(ev.clientY - startPointer.y) < 2) return;
      moved = true;
      setDoc((d) =>
        d
          ? withPage(d, pageIdxRef.current, (p) => ({
              ...p,
              elements: p.elements.map((item) => (item.id === el.id ? applyTo(item, ev) : item)),
            }))
          : d,
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      setGuides({ v: null, h: null });
      if (moved && base) pushPast(base);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  function addImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const d = docRef.current;
        if (d) addElement(createImage(d, src, img.naturalWidth, img.naturalHeight));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  async function runExport(format: "png" | "jpeg" | "pdf") {
    const d = docRef.current;
    if (!d || exporting) return;
    setExportOpen(false);
    setExporting(true);
    try {
      if (format === "pdf") await exportPdf(d);
      else await exportRaster(d, format, pageIdxRef.current);
    } finally {
      setExporting(false);
    }
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-lg font-semibold text-deep-ink">Design not found</p>
        <p className="mt-2 text-sm text-ink/60">It may have been deleted, or it was created on another device — designs are stored locally in your browser.</p>
        <Link href="/design" className="btn-primary mt-6">Back to Design Space</Link>
      </div>
    );
  }

  if (!doc || !page) {
    return <div className="flex h-[60vh] items-center justify-center text-sm text-ink/50">Loading design…</div>;
  }

  const editing = editingId ? page.elements.find((el) => el.id === editingId) : null;
  const multiPage = doc.pages.length > 1;

  return (
    <div className="flex h-[calc(100dvh-64px)] min-h-[480px] flex-col bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 bg-white px-3 py-2">
        <Link
          href="/design"
          aria-label="Back to my designs"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-ink/10 text-ink/70 hover:border-node-blue/40 hover:text-node-blue"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <input
          value={doc.name}
          onChange={(e) => setDoc({ ...doc, name: e.target.value })}
          aria-label="Design name"
          className="w-40 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-deep-ink outline-none hover:border-ink/15 focus:border-node-blue"
        />
        <div className="relative">
          <button
            onClick={() => setResizeOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md border border-ink/10 px-2.5 py-1.5 text-xs font-medium text-ink/70 hover:border-node-blue/40 hover:text-node-blue"
          >
            <Ruler className="h-3.5 w-3.5" />
            Resize
          </button>
          {resizeOpen && <ResizePopover doc={doc} onResize={resizeDesign} onClose={() => setResizeOpen(false)} />}
        </div>
        <span className="text-xs text-ink/40">{saved ? "Saved" : "Saving…"}</span>

        <div className="flex-1" />

        <ToolButton label="Undo" onClick={undo} disabled={past.current.length === 0}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Redo" onClick={redo} disabled={future.current.length === 0}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>

        <div className="mx-1 hidden items-center gap-1 sm:flex">
          <ToolButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.05, Math.round((z - 0.1) * 100) / 100))}>
            <Minus className="h-4 w-4" />
          </ToolButton>
          <span className="w-12 text-center text-xs text-ink/60">{Math.round(zoom * 100)}%</span>
          <ToolButton label="Zoom in" onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.1) * 100) / 100))}>
            <Plus className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Fit to screen" onClick={fitZoom}>
            <Maximize className="h-4 w-4" />
          </ToolButton>
        </div>

        <div className="relative">
          <button onClick={() => setExportOpen((o) => !o)} className="btn-primary gap-1.5 px-4 py-2 text-xs" disabled={exporting}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "Export"}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-ink/10 bg-white p-1.5 shadow-lg">
              {(
                [
                  ["png", multiPage ? "PNG image (this page)" : "PNG image"],
                  ["jpeg", multiPage ? "JPEG image (this page)" : "JPEG image"],
                  ["pdf", multiPage ? "PDF document (all pages)" : "PDF document"],
                ] as const
              ).map(([format, label]) => (
                <button
                  key={format}
                  onClick={() => runExport(format)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink/80 hover:bg-surface hover:text-node-blue"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <LeftRail
          onAddText={(preset) => {
            const d = docRef.current;
            if (d) addElement(createText(d, textPreset(d, preset)));
          }}
          onAddShape={(shape: ShapeKind) => {
            const d = docRef.current;
            if (d) addElement(createShape(d, shape));
          }}
          onAddImage={addImageFile}
          onAddEmoji={(emoji) => {
            const d = docRef.current;
            if (!d) return;
            const size = Math.round(Math.min(d.width, d.height) * 0.28);
            addElement(
              createText(d, {
                text: emoji,
                fontSize: Math.round(size * 0.8),
                w: size,
                h: size,
                x: Math.round((d.width - size) / 2),
                y: Math.round((d.height - size) / 2),
                align: "center",
                lineHeight: 1.2,
              }),
            );
          }}
          onInsertStockPhoto={(src, w, h) => {
            const d = docRef.current;
            if (d) addElement(createImage(d, src, w, h));
          }}
          onApplyTemplate={applyTemplate}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            ref={viewportRef}
            className="relative min-h-0 flex-1 overflow-auto"
            onPointerDown={() => {
              setSelectedId(null);
              setEditingId(null);
              setExportOpen(false);
            }}
          >
            <div
              className="relative mx-auto"
              style={{ width: doc.width * zoom + STAGE_PAD * 2, height: doc.height * zoom + STAGE_PAD * 2 }}
            >
              <div
                className="absolute flex items-center gap-1.5"
                style={{ left: STAGE_PAD, top: STAGE_PAD - 34, width: Math.max(doc.width * zoom, 320) }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="shrink-0 text-xs font-medium text-ink/50">
                  Page {pageIdx + 1} of {doc.pages.length}
                </span>
                <input
                  value={page.title}
                  onChange={(e) => commitPage("page-title", (p) => ({ ...p, title: e.target.value }))}
                  placeholder="Add page title"
                  aria-label="Page title"
                  className="w-36 min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-ink/70 outline-none placeholder:text-ink/30 hover:border-ink/15 focus:border-node-blue"
                />
                <div className="flex-1" />
                <button aria-label="Move page up" title="Move page up" onClick={() => movePage(-1)} disabled={pageIdx === 0} className="rounded p-1 text-ink/50 hover:bg-white hover:text-node-blue disabled:opacity-30">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button aria-label="Move page down" title="Move page down" onClick={() => movePage(1)} disabled={pageIdx === doc.pages.length - 1} className="rounded p-1 text-ink/50 hover:bg-white hover:text-node-blue disabled:opacity-30">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button aria-label="Duplicate page" title="Duplicate page" onClick={duplicatePage} className="rounded p-1 text-ink/50 hover:bg-white hover:text-node-blue">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button aria-label="Delete page" title="Delete page" onClick={deletePage} disabled={doc.pages.length <= 1} className="rounded p-1 text-ink/50 hover:bg-white hover:text-flag-red disabled:opacity-30">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button aria-label="Add page" title="Add page" onClick={addPage} className="rounded p-1 text-ink/50 hover:bg-white hover:text-node-blue">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div
                ref={artboardRef}
                className="absolute shadow-lg ring-1 ring-ink/10"
                style={{ left: STAGE_PAD, top: STAGE_PAD, width: doc.width * zoom, height: doc.height * zoom }}
              >
                <div
                  className="relative overflow-hidden"
                  style={{
                    width: doc.width,
                    height: doc.height,
                    transform: `scale(${zoom})`,
                    transformOrigin: "0 0",
                    background: backgroundCss(page),
                  }}
                >
                  {page.elements.map((el) => (
                    <div
                      key={el.id}
                      onPointerDown={(e) => beginDrag(e, el, { kind: "move" })}
                      onDoubleClick={el.type === "text" && !el.locked ? () => setEditingId(el.id) : undefined}
                      style={{
                        position: "absolute",
                        left: el.x,
                        top: el.y,
                        width: el.w,
                        height: el.h,
                        transform: `rotate(${el.rotation}deg)`,
                        opacity: el.opacity,
                        cursor: el.locked ? "default" : "move",
                      }}
                    >
                      {el.type === "shape" && (
                        <ShapeSvg shape={el.shape} w={el.w} h={el.h} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} radius={el.radius} />
                      )}
                      {el.type === "image" && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={el.src}
                          alt=""
                          draggable={false}
                          className="h-full w-full select-none object-fill"
                          style={{ borderRadius: el.radius }}
                        />
                      )}
                      {el.type === "text" &&
                        (editingId === el.id ? (
                          <textarea
                            autoFocus
                            value={el.text}
                            onPointerDown={(e) => e.stopPropagation()}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const text = e.target.value;
                              e.target.style.height = "0";
                              const h = Math.max(el.fontSize * el.lineHeight, e.target.scrollHeight);
                              e.target.style.height = "100%";
                              commitPage(`text:${el.id}`, (p) => ({
                                ...p,
                                elements: p.elements.map((item) =>
                                  item.id === el.id ? { ...item, text, h: Math.max(item.h, h) } : item,
                                ),
                              }));
                            }}
                            onBlur={() => setEditingId(null)}
                            className="absolute inset-0 resize-none overflow-hidden bg-transparent outline-none"
                            style={{
                              fontFamily: fontCss(el.font),
                              fontSize: el.fontSize,
                              fontWeight: el.bold ? 700 : 400,
                              fontStyle: el.italic ? "italic" : "normal",
                              color: el.color,
                              textAlign: el.align,
                              lineHeight: el.lineHeight,
                            }}
                          />
                        ) : (
                          <div
                            className="h-full w-full whitespace-pre-wrap break-words"
                            style={{
                              fontFamily: fontCss(el.font),
                              fontSize: el.fontSize,
                              fontWeight: el.bold ? 700 : 400,
                              fontStyle: el.italic ? "italic" : "normal",
                              color: el.color,
                              textAlign: el.align,
                              lineHeight: el.lineHeight,
                            }}
                          >
                            {el.text}
                          </div>
                        ))}
                    </div>
                  ))}

                  {guides.v !== null && (
                    <div
                      className="pointer-events-none absolute top-0"
                      style={{ left: guides.v - 1 / zoom, width: 2 / zoom, height: doc.height, background: "#ec4899" }}
                    />
                  )}
                  {guides.h !== null && (
                    <div
                      className="pointer-events-none absolute left-0"
                      style={{ top: guides.h - 1 / zoom, height: 2 / zoom, width: doc.width, background: "#ec4899" }}
                    />
                  )}
                </div>

                {selected && !editing && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: selected.x * zoom,
                      top: selected.y * zoom,
                      width: selected.w * zoom,
                      height: selected.h * zoom,
                      transform: `rotate(${selected.rotation}deg)`,
                    }}
                  >
                    <div className="absolute -inset-px border-2 border-node-blue" />
                    {!selected.locked &&
                      HANDLES.map(({ hx, hy, cursor }) => (
                        <div
                          key={`${hx},${hy}`}
                          onPointerDown={(e) => beginDrag(e, selected, { kind: "resize", hx, hy })}
                          className="pointer-events-auto absolute h-3 w-3 rounded-full border-2 border-node-blue bg-white"
                          style={{
                            cursor,
                            left: hx === -1 ? -6 : hx === 0 ? "calc(50% - 6px)" : undefined,
                            right: hx === 1 ? -6 : undefined,
                            top: hy === -1 ? -6 : hy === 0 ? "calc(50% - 6px)" : undefined,
                            bottom: hy === 1 ? -6 : undefined,
                          }}
                        />
                      ))}
                    {!selected.locked && (
                      <div
                        onPointerDown={(e) => beginDrag(e, selected, { kind: "rotate" })}
                        className="pointer-events-auto absolute -top-9 left-1/2 flex h-6 w-6 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border-2 border-node-blue bg-white text-node-blue"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 overflow-x-auto border-t border-ink/10 bg-white px-3 py-2">
            {doc.pages.map((p, i) => (
              <button
                key={p.id}
                onClick={() => selectPage(i)}
                aria-label={`Go to page ${i + 1}`}
                title={p.title || `Page ${i + 1}`}
                className={`flex h-10 w-14 shrink-0 items-center justify-center rounded-md border text-xs font-medium transition ${
                  i === pageIdx
                    ? "border-node-blue bg-node-blue/10 text-node-blue"
                    : "border-ink/15 text-ink/50 hover:border-node-blue/40"
                }`}
                style={{ background: i === pageIdx ? undefined : backgroundCss(p) }}
              >
                <span className={i === pageIdx ? "" : "rounded bg-white/70 px-1 text-ink/70"}>{i + 1}</span>
              </button>
            ))}
            <button
              onClick={addPage}
              aria-label="Add page"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-ink/20 text-ink/50 hover:border-node-blue/50 hover:text-node-blue"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <PropertiesPanel
          doc={doc}
          page={page}
          selected={selected}
          onUpdate={updateSelected}
          onLayer={reorderSelected}
          onDuplicate={duplicateSelected}
          onDelete={removeSelected}
          onBackground={(background) => commitPage("background", (p) => ({ ...p, background }))}
          onGradient={(backgroundGradient) => commitPage("background-gradient", (p) => ({ ...p, backgroundGradient }))}
          onCanvasSize={(width, height) => commit("canvas-size", (d) => ({ ...d, width, height }))}
        />
      </div>
    </div>
  );
}
