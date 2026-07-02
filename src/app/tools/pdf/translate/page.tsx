import type { Metadata } from "next";
import { buildToolMetadata, toolJsonLd } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";
import PremiumGuard from "@/components/PremiumGuard";
import ClientPage from "./client";

export const metadata: Metadata = buildToolMetadata("pdf", "translate");

export default function Page() {
  const jsonLd = toolJsonLd("pdf", "translate");
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Breadcrumbs category="pdf" slug="translate" />
      <PremiumGuard category="pdf" slug="translate">
        <ClientPage />
      </PremiumGuard>
    </>
  );
}
