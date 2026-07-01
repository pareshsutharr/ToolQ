import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Every online tool you need, one account`,
    short_name: "toolq",
    description:
      "Compress, merge, convert and edit PDFs and images free — fast, private, browser-based tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F6FA",
    theme_color: "#4F46E5",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
