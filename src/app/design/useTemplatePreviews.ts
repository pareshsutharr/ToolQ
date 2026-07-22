"use client";

import { useEffect, useState } from "react";
import { TEMPLATES } from "@/lib/design/presets";
import { ensureFontStylesheet } from "@/lib/design/types";
import { ensureFontsLoaded, loadImages, renderPage } from "@/lib/design/render";

/** Small live previews for template cards, rendered once on mount. */
export function useTemplatePreviews(): Record<string, string> {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      ensureFontStylesheet();
      const out: Record<string, string> = {};
      for (const t of TEMPLATES) {
        const doc = t.build();
        await ensureFontsLoaded(doc);
        const images = await loadImages(doc);
        const scale = 280 / Math.max(doc.width, doc.height);
        out[t.id] = renderPage(doc, doc.pages[0], images, scale).toDataURL("image/jpeg", 0.75);
        if (cancelled) return;
        setPreviews({ ...out });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return previews;
}
