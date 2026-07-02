import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Sign-in/up, admin, account and reset-password are excluded via
        // per-page `noindex` metadata instead of a crawl block — a robots.txt
        // disallow stops Googlebot from ever seeing that noindex tag, which
        // can leave a bare, description-less URL in the index if it's ever
        // linked externally. /auth/ and /api/ have no HTML to put a meta
        // tag on, so blocking their crawl is the only lever available.
        disallow: ["/auth/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
