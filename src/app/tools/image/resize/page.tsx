import type { Metadata } from "next";
import { buildToolMetadata, toolJsonLd } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";
import ClientPage from "./client";

export const metadata: Metadata = buildToolMetadata("image", "resize");

export default function Page() {
  const jsonLd = toolJsonLd("image", "resize");
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Breadcrumbs category="image" slug="resize" />
      <ClientPage />
    </>
  );
}
