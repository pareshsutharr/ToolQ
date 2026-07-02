import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { categories, findTool, type ToolCategory } from "@/lib/tools-catalog";

export default function Breadcrumbs({
  category,
  slug,
}: {
  category: ToolCategory;
  slug: string;
}) {
  const categoryMeta = categories.find((c) => c.id === category);
  const tool = findTool(category, slug);
  if (!categoryMeta || !tool) return null;

  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-2xl px-6 pt-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink/50">
        <li>
          <Link href="/" className="hover:text-node-blue">
            Home
          </Link>
        </li>
        <ChevronRight className="h-3 w-3" />
        <li>
          <Link href={`/tools/${category}`} className="hover:text-node-blue">
            {categoryMeta.label}
          </Link>
        </li>
        <ChevronRight className="h-3 w-3" />
        <li aria-current="page" className="text-ink/70">
          {tool.name}
        </li>
      </ol>
    </nav>
  );
}
