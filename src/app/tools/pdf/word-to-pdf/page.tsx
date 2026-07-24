import type { Metadata } from "next";
import { buildToolMetadata, toolJsonLd } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";
import ClientPage from "./client";

export const metadata: Metadata = buildToolMetadata("pdf", "word-to-pdf");

export default function Page() {
  const jsonLd = toolJsonLd("pdf", "word-to-pdf");
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Breadcrumbs category="pdf" slug="word-to-pdf" />
      <ClientPage />
    </>
  );
}
