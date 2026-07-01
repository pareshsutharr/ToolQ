"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { tools, type ToolMeta } from "@/lib/tools-catalog";
import { getToolIcon, groupColors } from "@/lib/tool-icons";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fuse = useMemo(
    () =>
      new Fuse(tools, {
        keys: [
          { name: "name", weight: 0.4 },
          { name: "keywords", weight: 0.35 },
          { name: "description", weight: 0.15 },
          { name: "seoKeyword", weight: 0.1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [],
  );

  const results: ToolMeta[] = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 8).map((r) => r.item);
  }, [fuse, query]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(tool: ToolMeta) {
    router.push(`/tools/${tool.category}/${tool.slug}`);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      goTo(results[activeIndex]);
    }
  }

  return (
    <div ref={containerRef} className="relative hidden w-64 lg:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search tools… e.g. &quot;shrink my pdf&quot;"
        className="w-full rounded-lg border border-ink/15 bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-node-blue focus:bg-white"
      />
      {open && query.trim() && (
        <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-ink/10 bg-white p-2 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink/50">No tools found for &quot;{query}&quot;.</p>
          ) : (
            <ul>
              {results.map((tool, i) => {
                const Icon = getToolIcon(tool.category, tool.slug);
                return (
                  <li key={`${tool.category}-${tool.slug}`}>
                    <button
                      onClick={() => goTo(tool)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left ${
                        i === activeIndex ? "bg-surface" : ""
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${groupColors[tool.group]}`}>
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-deep-ink">{tool.name}</span>
                        <span className="block truncate text-xs text-ink/50">{tool.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
