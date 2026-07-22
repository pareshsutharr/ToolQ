import Link from "next/link";
import { Palette, ArrowRight } from "lucide-react";
import { categories, toolsByCategory } from "@/lib/tools-catalog";
import ToolCard from "@/components/ToolCard";
import FeatureSection from "@/components/ui/stack-feature-section";
import { siteJsonLd } from "@/lib/seo";

export default function Home() {
  const jsonLd = siteJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FeatureSection />

      <section className="mx-auto max-w-6xl px-6 pt-14">
        <Link
          href="/design"
          className="card group flex flex-wrap items-center gap-4 p-6 transition hover:border-node-blue/40"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ai-gradient text-white">
            <Palette className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-semibold text-deep-ink group-hover:text-node-blue">
              ToolQ Design Space
            </span>
            <span className="block text-sm text-ink/60">
              Create social posts, thumbnails, posters and cards with a free drag-and-drop editor — right in your
              browser, saved on your device.
            </span>
          </span>
          <span className="btn-secondary shrink-0 gap-1.5 group-hover:border-node-blue/40 group-hover:text-node-blue">
            Open editor <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {categories.map((category) => (
        <section
          id={category.id === "pdf" ? "pdf-tools" : undefined}
          key={category.id}
          className="mx-auto max-w-6xl px-6 py-14"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-deep-ink">{category.label}</h2>
            <p className="text-sm text-ink/60">{category.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toolsByCategory(category.id).map((tool) => (
              <ToolCard key={`${tool.category}-${tool.slug}`} tool={tool} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
