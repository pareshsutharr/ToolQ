import { categories, toolsByCategory } from "@/lib/tools-catalog";
import ToolCard from "@/components/ToolCard";
import { SITE_URL, SITE_NAME, absoluteUrl } from "@/lib/seo";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/icon.svg"),
    },
    {
      "@type": "ItemList",
      name: "Tool categories",
      itemListElement: categories.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.label,
        url: absoluteUrl(`/tools/${c.id}`),
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="border-b border-ink/10 bg-gradient-to-b from-white to-surface">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="font-display text-4xl font-bold text-deep-ink sm:text-5xl">
            Every online tool you need.
            <br />
            <span className="bg-ai-gradient bg-clip-text text-transparent">One account.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink/60">
            Compress, merge, convert and edit PDFs and images — free, fast, and processed
            right in your browser.
          </p>
        </div>
      </section>

      {categories.map((category) => (
        <section key={category.id} className="mx-auto max-w-6xl px-6 py-14">
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
