import type { Metadata } from "next";
import { buildToolMetadata, toolJsonLd } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";
import ClientPage from "./client";

export const metadata: Metadata = buildToolMetadata("calculators", "age");

export default function Page() {
  const jsonLd = toolJsonLd("calculators", "age");
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Breadcrumbs category="calculators" slug="age" />
      <ClientPage />
    </>
  );
}
