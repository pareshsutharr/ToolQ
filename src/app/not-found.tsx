import type { Metadata } from "next";
import Link from "next/link";
import { categories } from "@/lib/tools-catalog";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="font-display text-6xl font-bold text-node-blue">404</p>
      <h1 className="mt-4 text-2xl font-bold text-deep-ink">Page not found</h1>
      <p className="mt-2 text-ink/60">
        That page doesn&apos;t exist, or it may have moved. Try one of these instead:
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {categories.map((c) => (
          <Link key={c.id} href={`/tools/${c.id}`} className="btn-secondary">
            {c.label}
          </Link>
        ))}
      </div>
      <Link href="/" className="btn-primary mt-6 inline-flex">
        Back to home
      </Link>
    </div>
  );
}
