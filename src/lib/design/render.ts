// Renders a DesignDoc onto an HTML canvas. Used for PNG/JPEG/PDF export and
// gallery thumbnails, so it must visually match the DOM stage in the editor.

import {
  ensureFontStylesheet,
  fontCanvas,
  type DesignDoc,
  type DesignElement,
  type DesignPage,
  type ShapeElement,
  type TextElement,
} from "./types";

export type ImageCache = Map<string, HTMLImageElement>;

function allElements(doc: DesignDoc): DesignElement[] {
  return doc.pages.flatMap((page) => page.elements);
}

/**
 * Makes sure every font a design uses is actually downloaded before drawing.
 * Google fonts only load when first used; canvas fillText won't wait, so an
 * export could silently fall back to a default face without this.
 */
export async function ensureFontsLoaded(doc: DesignDoc): Promise<void> {
  if (typeof document === "undefined") return;
  ensureFontStylesheet();
  const loads: Promise<unknown>[] = [];
  for (const el of allElements(doc)) {
    if (el.type !== "text") continue;
    const spec = `${el.italic ? "italic " : ""}${el.bold ? "700" : "400"} 16px ${fontCanvas(el.font)}`;
    loads.push(document.fonts.load(spec, el.text).catch(() => {}));
  }
  await Promise.allSettled(loads);
  await document.fonts.ready;
}

export function loadImages(doc: DesignDoc): Promise<ImageCache> {
  const sources = new Set<string>();
  for (const el of allElements(doc)) {
    if (el.type === "image") sources.add(el.src);
  }
  const cache: ImageCache = new Map();
  return Promise.all(
    Array.from(sources, (src) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          cache.set(src, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      }),
    ),
  ).then(() => cache);
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function starPoints(w: number, h: number): [number, number][] {
  const cx = w / 2;
  const cy = h / 2;
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const rx = (i % 2 === 0 ? 0.5 : 0.2) * w;
    const ry = (i % 2 === 0 ? 0.5 : 0.2) * h;
    points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
  }
  return points;
}

function shapePath(ctx: CanvasRenderingContext2D, el: ShapeElement) {
  switch (el.shape) {
    case "rect":
    case "line":
      roundedRectPath(ctx, 0, 0, el.w, el.h, el.shape === "line" ? el.h / 2 : el.radius);
      break;
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(el.w / 2, el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2);
      break;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(el.w / 2, 0);
      ctx.lineTo(el.w, el.h);
      ctx.lineTo(0, el.h);
      ctx.closePath();
      break;
    case "star": {
      const pts = starPoints(el.w, el.h);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py);
      ctx.closePath();
      break;
    }
  }
}

/** Transparent colors ("#00000000" or alpha 0) mean "no paint". */
function isPaintable(color: string): boolean {
  return Boolean(color) && !/^#([0-9a-f]{6}00|[0-9a-f]{3}0)$/i.test(color) && color !== "transparent";
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    if (!raw) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of raw.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement) {
  ctx.font = `${el.italic ? "italic " : ""}${el.bold ? "700" : "400"} ${el.fontSize}px ${fontCanvas(el.font)}`;
  ctx.fillStyle = el.color;
  ctx.textBaseline = "alphabetic";
  const lines = wrapText(ctx, el.text, el.w);
  const lineHeight = el.fontSize * el.lineHeight;
  // Match the DOM: first baseline sits ~0.8em below the top of the line box.
  let y = (lineHeight - el.fontSize) / 2 + el.fontSize * 0.8;
  for (const line of lines) {
    let x = 0;
    if (el.align !== "left") {
      const width = ctx.measureText(line).width;
      x = el.align === "center" ? (el.w - width) / 2 : el.w - width;
    }
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
}

function drawElement(ctx: CanvasRenderingContext2D, el: DesignElement, images: ImageCache) {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
  ctx.rotate((el.rotation * Math.PI) / 180);
  ctx.translate(-el.w / 2, -el.h / 2);

  if (el.type === "shape") {
    shapePath(ctx, el);
    if (isPaintable(el.fill)) {
      ctx.fillStyle = el.fill;
      ctx.fill();
    }
    if (el.strokeWidth > 0 && isPaintable(el.stroke)) {
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth;
      ctx.stroke();
    }
  } else if (el.type === "text") {
    drawText(ctx, el);
  } else {
    const img = images.get(el.src);
    if (img) {
      if (el.radius > 0) {
        roundedRectPath(ctx, 0, 0, el.w, el.h, el.radius);
        ctx.clip();
      }
      ctx.drawImage(img, 0, 0, el.w, el.h);
    }
  }
  ctx.restore();
}

export function renderPage(
  doc: Pick<DesignDoc, "width" | "height">,
  page: DesignPage,
  images: ImageCache,
  scale = 1,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(doc.width * scale));
  canvas.height = Math.max(1, Math.round(doc.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  if (page.backgroundGradient) {
    // Mirror CSS linear-gradient: 0deg points up, 90deg right; the gradient
    // line passes through the center and spans the artboard's projection.
    const rad = (page.backgroundGradient.angle * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const cx = doc.width / 2;
    const cy = doc.height / 2;
    const half = (Math.abs(doc.width * dx) + Math.abs(doc.height * dy)) / 2;
    const grad = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    grad.addColorStop(0, page.background);
    grad.addColorStop(1, page.backgroundGradient.to);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = page.background;
  }
  ctx.fillRect(0, 0, doc.width, doc.height);
  for (const el of page.elements) drawElement(ctx, el, images);
  return canvas;
}

export async function makeThumbnail(doc: DesignDoc): Promise<string> {
  await ensureFontsLoaded(doc);
  const images = await loadImages(doc);
  const scale = 360 / Math.max(doc.width, doc.height);
  return renderPage(doc, doc.pages[0], images, scale).toDataURL("image/jpeg", 0.7);
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

function safeName(doc: DesignDoc): string {
  return doc.name.trim().replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "design";
}

/** Exports one page (the active one in the editor) as PNG or JPEG. */
export async function exportRaster(doc: DesignDoc, format: "png" | "jpeg", pageIndex = 0): Promise<void> {
  await ensureFontsLoaded(doc);
  const images = await loadImages(doc);
  const page = doc.pages[Math.min(pageIndex, doc.pages.length - 1)];
  const canvas = renderPage(doc, page, images);
  const suffix = doc.pages.length > 1 ? `-page-${pageIndex + 1}` : "";
  if (format === "jpeg") {
    // JPEG has no alpha; the artboard background is already painted.
    download(canvas.toDataURL("image/jpeg", 0.92), `${safeName(doc)}${suffix}.jpg`);
  } else {
    download(canvas.toDataURL("image/png"), `${safeName(doc)}${suffix}.png`);
  }
}

/** Exports every page of the design as one multi-page PDF. */
export async function exportPdf(doc: DesignDoc): Promise<void> {
  await ensureFontsLoaded(doc);
  const { PDFDocument } = await import("pdf-lib");
  const images = await loadImages(doc);

  const pdf = await PDFDocument.create();
  for (const docPage of doc.pages) {
    const canvas = renderPage(doc, docPage, images);
    const pngBytes = await fetch(canvas.toDataURL("image/png")).then((r) => r.arrayBuffer());
    const page = pdf.addPage([doc.width, doc.height]);
    const png = await pdf.embedPng(pngBytes);
    page.drawImage(png, { x: 0, y: 0, width: doc.width, height: doc.height });
  }
  const bytes = await pdf.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  download(url, `${safeName(doc)}.pdf`);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
