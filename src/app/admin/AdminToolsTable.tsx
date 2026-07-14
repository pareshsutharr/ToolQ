"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { tools, categories, groupLabels, type ToolCategory } from "@/lib/tools-catalog";

const premiumStyles: Record<string, string> = {
  free: "bg-spark-lime/10 text-spark-lime",
  partial: "bg-amber/10 text-amber",
  premium: "bg-node-blue/10 text-node-blue",
};

export default function AdminToolsTable() {
  const [category, setCategory] = useState<ToolCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.seoKeyword.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 p-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools by name, slug, keyword…"
          className="w-full max-w-xs rounded-lg border border-ink/15 bg-surface px-3 py-2 text-sm outline-none focus:border-node-blue focus:bg-white"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              category === "all" ? "bg-deep-ink text-surface" : "bg-surface text-ink/60"
            }`}
          >
            All ({tools.length})
          </button>
          {categories.map((c) => {
            const count = tools.filter((t) => t.category === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  category === c.id ? "bg-deep-ink text-surface" : "bg-surface text-ink/60"
                }`}
              >
                {c.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-[32rem] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-2">Tool</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Group</th>
              <th className="px-4 py-2">Tier</th>
              <th className="px-4 py-2">SEO keyword</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {filtered.map((t) => (
              <tr key={`${t.category}-${t.slug}`} className="hover:bg-surface/60">
                <td className="px-4 py-2 font-medium text-deep-ink">{t.name}</td>
                <td className="px-4 py-2 text-ink/60">
                  {categories.find((c) => c.id === t.category)?.label}
                </td>
                <td className="px-4 py-2 text-ink/60">{groupLabels[t.group]}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${premiumStyles[t.premium]}`}
                  >
                    {t.premium}
                  </span>
                </td>
                <td className="px-4 py-2 text-ink/60">{t.seoKeyword}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/tools/${t.category}/${t.slug}`}
                    target="_blank"
                    className="text-node-blue hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink/40">
                  No tools match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
