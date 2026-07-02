import type { Metadata } from "next";
import { findTool, categories, toolsByCategory, type ToolCategory } from "@/lib/tools-catalog";

export const SITE_URL = "https://toolq.online";
export const SITE_NAME = "toolq.online";
export const BRAND_NAME = "toolQ";
export const SITE_TITLE = "toolQ - Free Online PDF, Image, Developer and Calculator Tools";
export const SITE_DESCRIPTION =
  "Use fast, private online tools for PDFs, images, developer utilities, generators and calculators. Most tools run in your browser and require no account.";
export const DEFAULT_OG_IMAGE = absoluteUrl("/opengraph-image");

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

const defaultRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
} satisfies Metadata["robots"];

function toolDescription(category: ToolCategory, slug: string): string {
  const tool = findTool(category, slug);
  if (!tool) return SITE_DESCRIPTION;

  const browserNote =
    tool.premium === "premium"
      ? "A premium browser-based tool for private document workflows."
      : "Free to use in your browser with no install required.";

  return `${tool.description} ${browserNote}`;
}

export function buildToolMetadata(category: ToolCategory, slug: string): Metadata {
  const tool = findTool(category, slug);
  if (!tool) return {};
  const title = `${titleCaseKeyword(tool.seoKeyword)} - ${tool.name}`;
  const description = toolDescription(category, slug);
  const url = absoluteUrl(`/tools/${category}/${slug}`);
  return {
    title,
    description,
    keywords: [tool.seoKeyword, ...tool.keywords],
    robots: defaultRobots,
    alternates: { canonical: url },
    category: "utilities",
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_TITLE }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function buildCategoryMetadata(categoryId: ToolCategory): Metadata {
  const meta = categories.find((c) => c.id === categoryId);
  if (!meta) return {};
  const url = absoluteUrl(`/tools/${categoryId}`);
  const count = toolsByCategory(categoryId).length;
  const title = `${meta.label} - ${count} Free Online ${meta.label}`;
  const description = `${meta.description}. Browse ${count} fast, browser-based ${meta.label.toLowerCase()} on ${BRAND_NAME}.`;
  return {
    title,
    description,
    robots: defaultRobots,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_TITLE }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: BRAND_NAME,
        url: SITE_URL,
        inLanguage: "en-US",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: BRAND_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/icon.svg"),
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: BRAND_NAME,
        url: SITE_URL,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript. Runs in a modern web browser.",
        description: SITE_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
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
}

export function categoryJsonLd(categoryId: ToolCategory) {
  const meta = categories.find((c) => c.id === categoryId);
  if (!meta) return null;
  const items = toolsByCategory(categoryId);
  const url = absoluteUrl(`/tools/${meta.id}`);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        name: meta.label,
        description: meta.description,
        url,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#itemlist` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: meta.label, item: url },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${url}#itemlist`,
        name: meta.label,
        numberOfItems: items.length,
        itemListElement: items.map((tool, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: tool.name,
          url: absoluteUrl(`/tools/${tool.category}/${tool.slug}`),
        })),
      },
    ],
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
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        name: tool.name,
        description: toolDescription(category, slug),
        url,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#software` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#software`,
        name: tool.name,
        description: toolDescription(category, slug),
        url,
        applicationCategory: "UtilityApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript. Runs in a modern web browser.",
        isAccessibleForFree: tool.premium !== "premium",
        featureList: [tool.seoKeyword, ...tool.keywords],
        publisher: { "@id": `${SITE_URL}/#organization` },
        offers:
          tool.premium === "premium"
            ? {
                "@type": "Offer",
                availability: "https://schema.org/InStock",
                url: absoluteUrl("/pricing"),
              }
            : {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
              },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
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
