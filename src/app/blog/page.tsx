import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBlogPosts } from "@/lib/blog";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ToolQ Blog - Practical Guides for Online Tools",
  description:
    "Practical guides for PDFs, images, developer utilities, generators and calculators, with live ToolQ workflows.",
  alternates: { canonical: absoluteUrl("/blog") },
  openGraph: {
    title: "ToolQ Blog - Practical Guides for Online Tools",
    description:
      "Practical guides for PDFs, images, developer utilities, generators and calculators.",
    url: absoluteUrl("/blog"),
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "ToolQ Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ToolQ Blog - Practical Guides for Online Tools",
    description:
      "Practical guides for PDFs, images, developer utilities, generators and calculators.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function BlogPage() {
  const posts = getPublishedBlogPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "ToolQ Blog",
    description: metadata.description,
    url: absoluteUrl("/blog"),
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.publishAt,
      dateModified: post.updatedAt ?? post.publishAt,
      url: absoluteUrl(`/blog/${post.slug}`),
    })),
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-node-blue">ToolQ Blog</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-deep-ink sm:text-4xl">
          Practical guides for everyday online tools
        </h1>
        <p className="mt-3 text-ink/60">
          Twice a week, ToolQ publishes useful workflows for PDFs, images, developer
          utilities, generators and calculators.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {posts.map((post) => (
          <article key={post.slug} className="card flex flex-col p-6">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-node-blue/10 px-2.5 py-1 text-xs font-medium text-node-blue"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-deep-ink">
              <Link href={`/blog/${post.slug}`} className="hover:text-node-blue">
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-ink/60">{post.description}</p>
            <div className="mt-5 flex items-center justify-between text-xs text-ink/45">
              <time dateTime={post.publishAt}>
                {new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(post.publishAt))}
              </time>
              <span>{post.readMinutes} min read</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
