import type { Metadata } from "next";
import { findTool, categories, type ToolCategory } from "@/lib/tools-catalog";

export const SITE_URL = "https://toolq.online";
export const SITE_NAME = "toolq.online";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// Keeps well-known acronyms uppercase (PDF, QR, JWT…) when turning a
// lowercase target search phrase like "merge pdf online free" into a
// title-cased page title — plain Title Case would otherwise render "Pdf".
const ACRONYMS = new Set([
  "pdf", "qr", "jwt", "uuid", "url", "json", "jpg", "png", "bmi", "emi",
  "css", "html", "xml", "ocr", "api", "ai", "md5", "sha", "hsl", "rgb",
]);

function titleCaseKeyword(keyword: string): string {
  return keyword
    .split(" ")
    .map((word) => (ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

export function buildToolMetadata(category: ToolCategory, slug: string): Metadata {
  const tool = findTool(category, slug);
  if (!tool) return {};
  const title = titleCaseKeyword(tool.seoKeyword);
  const url = absoluteUrl(`/tools/${category}/${slug}`);
  return {
    title,
    description: tool.description,
    keywords: [tool.seoKeyword, ...tool.keywords],
    alternates: { canonical: url },
    openGraph: {
      title,
      description: tool.description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: tool.description,
    },
  };
}

export function buildCategoryMetadata(categoryId: ToolCategory): Metadata {
  const meta = categories.find((c) => c.id === categoryId);
  if (!meta) return {};
  const url = absoluteUrl(`/tools/${categoryId}`);
  return {
    title: meta.label,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      title: meta.label,
      description: meta.description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.label,
      description: meta.description,
    },
  };
}

export function toolJsonLd(category: ToolCategory, slug: string) {
  const tool = findTool(category, slug);
  if (!tool) return null;
  const url = absoluteUrl(`/tools/${category}/${slug}`);
  const categoryMeta = categories.find((c) => c.id === category);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: tool.name,
        description: tool.description,
        url,
        applicationCategory: "UtilityApplication",
        operatingSystem: "Any (runs in the browser)",
        offers: {
          "@type": "Offer",
          price: tool.premium === "premium" ? undefined : "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          categoryMeta && {
            "@type": "ListItem",
            position: 2,
            name: categoryMeta.label,
            item: absoluteUrl(`/tools/${category}`),
          },
          { "@type": "ListItem", position: 3, name: tool.name, item: url },
        ].filter(Boolean),
      },
    ],
  };
}
