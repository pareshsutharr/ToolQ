"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { categories, toolsByCategoryGrouped, type ToolCategory } from "@/lib/tools-catalog";
import { getToolIcon, groupColors } from "@/lib/tool-icons";

export default function MegaMenu() {
  const [openCategory, setOpenCategory] = useState<ToolCategory | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenCategory(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="hidden items-center gap-6 md:flex">
      {categories.map((c) => {
        const isOpen = openCategory === c.id;
        const grouped = toolsByCategoryGrouped(c.id);
        return (
          <div key={c.id} className="relative">
            <button
              onClick={() => setOpenCategory(isOpen ? null : c.id)}
              className="flex items-center gap-1 text-sm font-medium text-ink/70 hover:text-node-blue"
              aria-expanded={isOpen}
            >
              {c.label}
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="absolute left-1/2 top-full z-20 mt-3 w-[min(90vw,860px)] -translate-x-1/2 rounded-xl border border-ink/10 bg-white p-6 shadow-lg">
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
                  {grouped.map(({ group, label, tools: groupTools }) => (
                    <div key={group}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
                        {label}
                      </p>
                      <ul className="flex flex-col gap-2">
                        {groupTools.map((tool) => {
                          const Icon = getToolIcon(tool.category, tool.slug);
                          return (
                            <li key={tool.slug}>
                              <Link
                                href={`/tools/${tool.category}/${tool.slug}`}
                                onClick={() => setOpenCategory(null)}
                                className="flex items-center gap-2 rounded-lg p-1 text-sm text-ink/80 hover:bg-surface hover:text-node-blue"
                              >
                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${groupColors[tool.group]}`}>
                                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                                </span>
                                {tool.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
