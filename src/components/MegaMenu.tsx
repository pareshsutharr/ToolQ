"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  categories,
  toolsByCategory,
  toolsByCategoryGrouped,
  type ToolCategory,
  type ToolMeta,
} from "@/lib/tools-catalog";
import { getToolIcon, groupColors } from "@/lib/tool-icons";

const PRIMARY_CATEGORIES: ToolCategory[] = ["pdf", "image"];
const MORE_CATEGORIES: ToolCategory[] = ["dev", "generators", "calculators"];
const VIEWPORT_MARGIN = 16;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Panels are left-anchored to their trigger by default, but a trigger near
// the right side of a narrow viewport can still push a wide panel off
// screen. Measure after render and nudge it back into view before the user
// sees it (useLayoutEffect runs before paint, so there's no visible jump).
function useClampToViewport(isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);

  useLayoutEffect(() => {
    if (!isOpen || !ref.current) {
      setOffsetX(0);
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const overflowRight = rect.right - (window.innerWidth - VIEWPORT_MARGIN);
    if (overflowRight > 0) {
      setOffsetX(-Math.min(overflowRight, rect.left - VIEWPORT_MARGIN));
    } else {
      setOffsetX(0);
    }
  }, [isOpen]);

  return { ref, style: offsetX ? { transform: `translateX(${offsetX}px)` } : undefined };
}

function ToolLink({ tool, onNavigate }: { tool: ToolMeta; onNavigate: () => void }) {
  const Icon = getToolIcon(tool.category, tool.slug);
  return (
    <Link
      href={`/tools/${tool.category}/${tool.slug}`}
      onClick={onNavigate}
      className="flex items-start gap-2 rounded-lg p-1.5 text-sm leading-snug text-ink/80 transition-colors hover:bg-surface hover:text-node-blue"
    >
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded ${groupColors[tool.group]}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <span>{tool.name}</span>
    </Link>
  );
}

function CategoryDropdown({
  id,
  isOpen,
  onToggle,
  onNavigate,
}: {
  id: ToolCategory;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const meta = categories.find((c) => c.id === id)!;
  const grouped = toolsByCategoryGrouped(id);
  const { ref, style } = useClampToViewport(isOpen);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-sm font-medium text-ink/70 hover:text-node-blue"
        aria-expanded={isOpen}
      >
        {meta.label}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          ref={ref}
          style={style}
          className="absolute left-0 top-full z-20 mt-3 w-[min(92vw,860px)] max-h-[75vh] overflow-y-auto rounded-xl border border-ink/10 bg-white p-6 shadow-xl"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            {grouped.map(({ group, label, tools: groupTools }) => (
              <div key={group}>
                <p className="mb-2 border-b border-ink/10 pb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
                  {label}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {groupTools.map((tool) => (
                    <li key={tool.slug}>
                      <ToolLink tool={tool} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MoreToolsDropdown({
  isOpen,
  onToggle,
  onNavigate,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const { ref, style } = useClampToViewport(isOpen);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-sm font-medium text-ink/70 hover:text-node-blue"
        aria-expanded={isOpen}
      >
        More Tools
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          ref={ref}
          style={style}
          className="absolute left-0 top-full z-20 mt-3 w-[min(94vw,900px)] max-h-[75vh] overflow-y-auto rounded-xl border border-ink/10 bg-white p-6 shadow-xl"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {MORE_CATEGORIES.map((id) => {
              const meta = categories.find((c) => c.id === id)!;
              const items = toolsByCategory(id);
              // Split long lists (e.g. 11 Developer Tools) into balanced
              // sub-columns instead of one lopsided column of the panel.
              const columns = chunk(items, Math.ceil(items.length / (items.length > 8 ? 2 : 1)));
              return columns.map((col, i) => (
                <div key={`${id}-${i}`}>
                  {i === 0 && (
                    <p className="mb-2 border-b border-ink/10 pb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
                      {meta.label}
                    </p>
                  )}
                  <ul className={`flex flex-col gap-0.5 ${i > 0 ? "mt-6" : ""}`}>
                    {col.map((tool) => (
                      <li key={tool.slug}>
                        <ToolLink tool={tool} onNavigate={onNavigate} />
                      </li>
                    ))}
                  </ul>
                </div>
              ));
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MegaMenu() {
  const [openMenu, setOpenMenu] = useState<ToolCategory | "more" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  function close() {
    setOpenMenu(null);
  }

  return (
    <div ref={containerRef} className="hidden items-center gap-6 md:flex">
      {PRIMARY_CATEGORIES.map((id) => (
        <CategoryDropdown
          key={id}
          id={id}
          isOpen={openMenu === id}
          onToggle={() => setOpenMenu(openMenu === id ? null : id)}
          onNavigate={close}
        />
      ))}
      <MoreToolsDropdown
        isOpen={openMenu === "more"}
        onToggle={() => setOpenMenu(openMenu === "more" ? null : "more")}
        onNavigate={close}
      />
    </div>
  );
}
