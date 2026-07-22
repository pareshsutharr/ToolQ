// Data model for ToolQ Design Space. A design is a fixed-size artboard with a
// flat, z-ordered list of elements. Everything is JSON-serializable so designs
// persist to IndexedDB and render identically on the DOM stage and the export
// canvas.

export type FontToken = string;

export interface FontDef {
  token: FontToken;
  label: string;
  /** CSS font-family stack (may reference a next/font CSS variable). */
  css: string;
  /** Google Fonts css2 family query, for fonts not bundled with the site. */
  google?: string;
}

export const FONT_DEFS: FontDef[] = [
  { token: "display", label: "Outfit", css: "var(--font-display)" },
  { token: "body", label: "Inter", css: "var(--font-body)" },
  { token: "mono", label: "JetBrains Mono", css: "var(--font-mono)" },
  { token: "montserrat", label: "Montserrat", css: "'Montserrat', sans-serif", google: "Montserrat:ital,wght@0,400;0,700;1,400" },
  { token: "poppins", label: "Poppins", css: "'Poppins', sans-serif", google: "Poppins:ital,wght@0,400;0,700;1,400" },
  { token: "roboto", label: "Roboto", css: "'Roboto', sans-serif", google: "Roboto:ital,wght@0,400;0,700;1,400" },
  { token: "oswald", label: "Oswald", css: "'Oswald', sans-serif", google: "Oswald:wght@400;700" },
  { token: "bebas", label: "Bebas Neue", css: "'Bebas Neue', sans-serif", google: "Bebas Neue" },
  { token: "playfair", label: "Playfair Display", css: "'Playfair Display', serif", google: "Playfair Display:ital,wght@0,400;0,700;1,400" },
  { token: "merriweather", label: "Merriweather", css: "'Merriweather', serif", google: "Merriweather:ital,wght@0,400;0,700;1,400" },
  { token: "abril", label: "Abril Fatface", css: "'Abril Fatface', serif", google: "Abril Fatface" },
  { token: "lobster", label: "Lobster", css: "'Lobster', cursive", google: "Lobster" },
  { token: "pacifico", label: "Pacifico", css: "'Pacifico', cursive", google: "Pacifico" },
  { token: "dancing", label: "Dancing Script", css: "'Dancing Script', cursive", google: "Dancing Script:wght@400;700" },
  { token: "caveat", label: "Caveat", css: "'Caveat', cursive", google: "Caveat:wght@400;700" },
  { token: "arial", label: "Arial", css: "Arial, Helvetica, sans-serif" },
  { token: "georgia", label: "Georgia", css: "Georgia, serif" },
  { token: "times", label: "Times New Roman", css: "'Times New Roman', Times, serif" },
  { token: "courier", label: "Courier New", css: "'Courier New', Courier, monospace" },
];

const FONT_MAP = new Map(FONT_DEFS.map((f) => [f.token, f]));

/**
 * Injects one stylesheet with every Google font the editor offers. Font
 * files themselves are only downloaded by the browser once a family is
 * actually used, so this is cheap. Safe to call repeatedly.
 */
export function ensureFontStylesheet(): void {
  if (typeof document === "undefined") return;
  const ID = "toolq-design-fonts";
  if (document.getElementById(ID)) return;
  const families = FONT_DEFS.filter((f) => f.google)
    .map((f) => `family=${encodeURIComponent(f.google!).replace(/%20/g, "+")}`)
    .join("&");
  const link = document.createElement("link");
  link.id = ID;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}

export type ShapeKind = "rect" | "ellipse" | "triangle" | "star" | "line";

interface ElementBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise around the element center. */
  rotation: number;
  /** 0–1 */
  opacity: number;
  locked: boolean;
}

export interface TextElement extends ElementBase {
  type: "text";
  text: string;
  font: FontToken;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number;
}

export interface ShapeElement extends ElementBase {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Corner radius, only used by rect. */
  radius: number;
}

export interface ImageElement extends ElementBase {
  type: "image";
  /** Data URL — designs are fully self-contained. */
  src: string;
  radius: number;
}

export type DesignElement = TextElement | ShapeElement | ImageElement;

export interface DesignPage {
  id: string;
  /** Optional page title, shown above the canvas (Canva-style). */
  title: string;
  background: string;
  /** When set, the background is a linear gradient from `background` to `to`. */
  backgroundGradient?: { to: string; angle: number } | null;
  elements: DesignElement[];
}

export interface DesignDoc {
  id: string;
  name: string;
  width: number;
  height: number;
  pages: DesignPage[];
  createdAt: number;
  updatedAt: number;
  /** Small JPEG data URL for the gallery card (first page). */
  thumbnail?: string;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createPage(): DesignPage {
  return { id: uid(), title: "", background: "#ffffff", backgroundGradient: null, elements: [] };
}

export function createDesign(name: string, width: number, height: number): DesignDoc {
  const now = Date.now();
  return {
    id: uid(),
    name,
    width,
    height,
    pages: [createPage()],
    createdAt: now,
    updatedAt: now,
  };
}

/** Pre-pages docs stored a single element list + background at the top level. */
interface LegacyDesignDoc extends Omit<DesignDoc, "pages"> {
  pages?: DesignPage[];
  elements?: DesignElement[];
  background?: string;
  backgroundGradient?: { to: string; angle: number } | null;
}

/** Upgrades designs saved before multi-page support. Safe on current docs. */
export function migrateDesign(raw: DesignDoc | LegacyDesignDoc): DesignDoc {
  if (Array.isArray(raw.pages) && raw.pages.length > 0) return raw as DesignDoc;
  const legacy = raw as LegacyDesignDoc;
  const { elements, background, backgroundGradient, ...rest } = legacy;
  return {
    ...rest,
    pages: [
      {
        id: uid(),
        title: "",
        background: background ?? "#ffffff",
        backgroundGradient: backgroundGradient ?? null,
        elements: elements ?? [],
      },
    ],
  };
}

export function createText(doc: Pick<DesignDoc, "width" | "height">, overrides: Partial<TextElement> = {}): TextElement {
  const fontSize = Math.round(doc.width / 15);
  const w = Math.round(doc.width * 0.6);
  return {
    id: uid(),
    type: "text",
    x: Math.round((doc.width - w) / 2),
    y: Math.round(doc.height / 2 - fontSize),
    w,
    h: Math.round(fontSize * 1.5),
    rotation: 0,
    opacity: 1,
    locked: false,
    text: "Add your text",
    font: "display",
    fontSize,
    bold: false,
    italic: false,
    color: "#1c1917",
    align: "center",
    lineHeight: 1.2,
    ...overrides,
  };
}

export function createShape(
  doc: Pick<DesignDoc, "width" | "height">,
  shape: ShapeKind,
  overrides: Partial<ShapeElement> = {},
): ShapeElement {
  const size = Math.round(Math.min(doc.width, doc.height) * 0.3);
  const isLine = shape === "line";
  const w = isLine ? Math.round(doc.width * 0.4) : size;
  const h = isLine ? 8 : size;
  return {
    id: uid(),
    type: "shape",
    shape,
    x: Math.round((doc.width - w) / 2),
    y: Math.round((doc.height - h) / 2),
    w,
    h,
    rotation: 0,
    opacity: 1,
    locked: false,
    fill: "#4f46e5",
    stroke: "#00000000",
    strokeWidth: 0,
    radius: shape === "rect" ? 0 : 0,
    ...overrides,
  };
}

export function createImage(
  doc: Pick<DesignDoc, "width" | "height">,
  src: string,
  naturalW: number,
  naturalH: number,
): ImageElement {
  const maxW = doc.width * 0.6;
  const maxH = doc.height * 0.6;
  const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
  const w = Math.round(naturalW * scale);
  const h = Math.round(naturalH * scale);
  return {
    id: uid(),
    type: "image",
    src,
    x: Math.round((doc.width - w) / 2),
    y: Math.round((doc.height - h) / 2),
    w,
    h,
    rotation: 0,
    opacity: 1,
    locked: false,
    radius: 0,
  };
}

/** CSS font-family for the DOM stage. */
export function fontCss(token: FontToken): string {
  return FONT_MAP.get(token)?.css ?? "var(--font-body)";
}

/** CSS background for the DOM stage (solid color or linear gradient). */
export function backgroundCss(page: Pick<DesignPage, "background" | "backgroundGradient">): string {
  return page.backgroundGradient
    ? `linear-gradient(${page.backgroundGradient.angle}deg, ${page.background}, ${page.backgroundGradient.to})`
    : page.background;
}

/**
 * Concrete font-family string for canvas export. CSS variables don't resolve
 * inside canvas font specs, so read them off the document root.
 */
export function fontCanvas(token: FontToken): string {
  const css = fontCss(token);
  if (!css.startsWith("var(")) return css;
  if (typeof document === "undefined") return "sans-serif";
  const name = css.slice(4, -1);
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || "sans-serif";
}
