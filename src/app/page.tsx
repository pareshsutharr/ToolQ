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
