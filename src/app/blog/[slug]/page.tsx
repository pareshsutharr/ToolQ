import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost, getBlogTool, getPublishedBlogPosts, type BlogPost } from "@/lib/blog";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: post.publishAt,
      modifiedTime: post.updatedAt ?? post.publishAt,
      tags: post.tags,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const relatedPosts = getPublishedBlogPosts()
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3);
  const jsonLd = articleJsonLd(post);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink/50">
          <li>
            <Link href="/" className="hover:text-node-blue">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/blog" className="hover:text-node-blue">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink/70">
            {post.title}
          </li>
        </ol>
      </nav>

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
      <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-deep-ink sm:text-4xl">
        {post.title}
      </h1>
      <p className="mt-4 text-lg leading-8 text-ink/65">{post.description}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-ink/45">
        <time dateTime={post.publishAt}>
          {new Intl.DateTimeFormat("en", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(new Date(post.publishAt))}
        </time>
        <span aria-hidden="true">·</span>
        <span>{post.readMinutes} min read</span>
      </div>

      <div className="mt-10 space-y-10">
        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-2xl font-semibold text-deep-ink">
              {section.heading}
            </h2>
            <div className="mt-3 space-y-4 text-base leading-8 text-ink/70">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {section.example && (
              <div className="mt-5 rounded-lg border border-node-blue/15 bg-node-blue/5 p-4 text-sm leading-6 text-ink/70">
                {section.example}
              </div>
            )}
            {section.steps && (
              <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink/70">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      <section className="mt-12 border-t border-ink/10 pt-8">
        <h2 className="font-display text-xl font-semibold text-deep-ink">
          Tools used in this guide
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {post.relatedTools.map((link) => {
            const tool = getBlogTool(link);
            if (!tool) return null;
            return (
              <Link
                key={`${link.category}-${link.slug}`}
                href={`/tools/${link.category}/${link.slug}`}
                className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="font-medium text-deep-ink">{tool.name}</span>
                <span className="mt-1 block text-sm leading-6 text-ink/60">
                  {link.reason}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {relatedPosts.length > 0 && (
        <section className="mt-12 border-t border-ink/10 pt-8">
          <h2 className="font-display text-xl font-semibold text-deep-ink">
            More ToolQ guides
          </h2>
          <div className="mt-4 space-y-3">
            {relatedPosts.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="block rounded-lg border border-ink/10 p-4 hover:border-node-blue/30"
              >
                <span className="font-medium text-deep-ink">{item.title}</span>
                <span className="mt-1 block text-sm text-ink/60">{item.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function articleJsonLd(post: BlogPost) {
  const url = absoluteUrl(`/blog/${post.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishAt,
    dateModified: post.updatedAt ?? post.publishAt,
    mainEntityOfPage: url,
    url,
    author: {
      "@type": "Organization",
      name: "ToolQ",
      url: absoluteUrl("/"),
    },
    publisher: {
      "@type": "Organization",
      name: "ToolQ",
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/icon.svg"),
      },
    },
  };
}
