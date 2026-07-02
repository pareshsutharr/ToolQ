import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, toolsByCategory, type ToolCategory } from "@/lib/tools-catalog";
import ToolCard from "@/components/ToolCard";
import { absoluteUrl, buildCategoryMetadata, SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return buildCategoryMetadata(category as ToolCategory);
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: meta.label,
    description: meta.description,
    url: absoluteUrl(`/tools/${meta.id}`),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: meta.label, item: absoluteUrl(`/tools/${meta.id}`) },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((tool, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: tool.name,
        url: absoluteUrl(`/tools/${tool.category}/${tool.slug}`),
      })),
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-xs text-ink/50">
          <li>
            <Link href="/" className="hover:text-node-blue">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink/70">
            {meta.label}
          </li>
        </ol>
      </nav>
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
