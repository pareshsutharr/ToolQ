import Link from "next/link";
import type { ToolMeta } from "@/lib/tools-catalog";

const badgeStyles: Record<ToolMeta["premium"], string> = {
  free: "bg-spark-lime/20 text-deep-ink",
  partial: "bg-node-blue/10 text-node-blue",
  premium: "bg-ai-gradient text-white",
};

const badgeLabel: Record<ToolMeta["premium"], string> = {
  free: "Free",
  partial: "Free + Pro",
  premium: "Pro",
};

export default function ToolCard({ tool }: { tool: ToolMeta }) {
  return (
    <Link
      href={`/tools/${tool.category}/${tool.slug}`}
      className="card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-display text-base font-semibold text-deep-ink group-hover:text-node-blue">
          {tool.name}
        </h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyles[tool.premium]}`}>
          {badgeLabel[tool.premium]}
        </span>
      </div>
      <p className="text-sm text-ink/60">{tool.description}</p>
    </Link>
  );
}
