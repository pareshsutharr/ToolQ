import type { Metadata } from "next";
import { buildToolMetadata, toolJsonLd } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";
import ClientPage from "./client";

export const metadata: Metadata = buildToolMetadata("dev", "regex-tester");

export default function Page() {
  const jsonLd = toolJsonLd("dev", "regex-tester");
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Breadcrumbs category="dev" slug="regex-tester" />
      <ClientPage />
    </>
  );
}
