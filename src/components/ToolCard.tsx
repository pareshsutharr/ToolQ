import Link from "next/link";
import type { ToolMeta } from "@/lib/tools-catalog";
import { getToolIcon, groupColors } from "@/lib/tool-icons";

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
  const Icon = getToolIcon(tool.category, tool.slug);
  return (
    <Link
      href={`/tools/${tool.category}/${tool.slug}`}
      className="card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${groupColors[tool.group]}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyles[tool.premium]}`}>
          {badgeLabel[tool.premium]}
        </span>
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-deep-ink group-hover:text-node-blue">
          {tool.name}
        </h3>
        <p className="mt-1 text-sm text-ink/60">{tool.description}</p>
      </div>
    </Link>
  );
}
