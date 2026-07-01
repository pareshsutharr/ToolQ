import { categories, toolsByCategory } from "@/lib/tools-catalog";
import ToolCard from "@/components/ToolCard";

export default function Home() {
  return (
    <>
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
