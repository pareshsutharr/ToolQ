import type { Metadata } from "next";
import { buildToolMetadata, toolJsonLd } from "@/lib/seo";
import ClientPage from "./client";

export const metadata: Metadata = buildToolMetadata("image", "remove-background");

export default function Page() {
  const jsonLd = toolJsonLd("image", "remove-background");
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ClientPage />
    </>
  );
}
