import type { Metadata } from "next";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME, SITE_TITLE } from "@/lib/seo";
import GalleryClient from "./GalleryClient";

const title = "ToolQ Design Space - Free Online Graphic Design Editor";
const description =
  "Create social posts, thumbnails, posters and cards in your browser. Drag-and-drop text, shapes and images, then export as PNG, JPEG or PDF. Free, no account — designs stay on your device.";
const url = absoluteUrl("/design");

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "free online design editor",
    "canva alternative",
    "graphic design tool",
    "social media post maker",
    "youtube thumbnail maker",
    "poster maker online",
  ],
  alternates: { canonical: url },
  openGraph: {
    title,
    description,
    url,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
};

export default function Page() {
  return <GalleryClient />;
}
