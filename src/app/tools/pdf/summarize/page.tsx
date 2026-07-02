import type { Metadata } from "next";
import { buildToolMetadata, toolJsonLd } from "@/lib/seo";
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
      <PremiumGuard category="pdf" slug="summarize">
        <ClientPage />
      </PremiumGuard>
    </>
  );
}
