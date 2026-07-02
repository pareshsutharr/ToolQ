import Link from "next/link";
import { categories, toolsByCategory } from "@/lib/tools-catalog";

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <div key={c.id}>
              <h3 className="mb-3 text-sm font-semibold text-deep-ink">{c.label}</h3>
              <ul className="space-y-2">
                {toolsByCategory(c.id).map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/tools/${c.id}/${t.slug}`}
                      className="text-sm text-ink/60 hover:text-node-blue"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-6">
          <p className="text-xs text-ink/40">
            Files are processed in your browser and never uploaded unless a tool says otherwise.
            © {new Date().getFullYear()} toolq.online.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="text-xs font-medium text-ink/50 hover:text-node-blue">
              Blog
            </Link>
            <Link href="/pricing" className="text-xs font-medium text-ink/50 hover:text-node-blue">
              Pricing
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
