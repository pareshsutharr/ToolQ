import { notFound } from "next/navigation";
import { categories, toolsByCategory, type ToolCategory } from "@/lib/tools-catalog";
import ToolCard from "@/components/ToolCard";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.id }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = categories.find((c) => c.id === category);
  if (!meta) notFound();

  const items = toolsByCategory(category as ToolCategory);

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="text-3xl font-bold text-deep-ink">{meta.label}</h1>
      <p className="mt-2 text-ink/60">{meta.description}</p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </div>
  );
}
