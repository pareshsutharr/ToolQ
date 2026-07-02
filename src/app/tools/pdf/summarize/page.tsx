import type { Metadata } from "next";
import { buildToolMetadata, toolJsonLd } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";
import PremiumGuard from "@/components/PremiumGuard";
import ClientPage from "./client";

export const metadata: Metadata = buildToolMetadata("pdf", "summarize");

export default function Page() {
  const jsonLd = toolJsonLd("pdf", "summarize");
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Breadcrumbs category="pdf" slug="summarize" />
      <PremiumGuard category="pdf" slug="summarize">
        <ClientPage />
      </PremiumGuard>
    </>
  );
}
