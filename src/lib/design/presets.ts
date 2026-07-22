import {
  createDesign,
  createShape,
  createText,
  FONT_DEFS,
  type DesignDoc,
  type FontToken,
} from "./types";

export interface SizePreset {
  id: string;
  label: string;
  hint: string;
  width: number;
  height: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: "ig-post", label: "Instagram Post", hint: "1080 × 1080", width: 1080, height: 1080 },
  { id: "ig-story", label: "Instagram Story", hint: "1080 × 1920", width: 1080, height: 1920 },
  { id: "yt-thumb", label: "YouTube Thumbnail", hint: "1280 × 720", width: 1280, height: 720 },
  { id: "presentation", label: "Presentation", hint: "1920 × 1080", width: 1920, height: 1080 },
  { id: "poster", label: "Poster (A4)", hint: "1240 × 1754", width: 1240, height: 1754 },
  { id: "banner", label: "X / Twitter Post", hint: "1600 × 900", width: 1600, height: 900 },
  { id: "business-card", label: "Business Card", hint: "1050 × 600", width: 1050, height: 600 },
  { id: "og-image", label: "OG Image", hint: "1200 × 630", width: 1200, height: 630 },
];

export const FONT_OPTIONS: { value: FontToken; label: string }[] = FONT_DEFS.map((f) => ({
  value: f.token,
  label: f.label,
}));

export const GRADIENT_PRESETS: { from: string; to: string; angle: number }[] = [
  { from: "#4f46e5", to: "#22d3ee", angle: 135 },
  { from: "#ec4899", to: "#f59e0b", angle: 135 },
  { from: "#0ea5e9", to: "#10b981", angle: 135 },
  { from: "#8b5cf6", to: "#ec4899", angle: 135 },
  { from: "#f97316", to: "#dc2626", angle: 135 },
  { from: "#1c1917", to: "#4f46e5", angle: 135 },
  { from: "#0f172a", to: "#0ea5e9", angle: 180 },
  { from: "#fbcfe8", to: "#e0e7ff", angle: 135 },
  { from: "#fef3c7", to: "#fca5a5", angle: 135 },
  { from: "#d1fae5", to: "#a5f3fc", angle: 135 },
];

export const EMOJI_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Smileys",
    items: ["😀", "😂", "🥹", "😍", "🤩", "😎", "🥳", "🤔", "😴", "🤯", "😱", "🫶"],
  },
  {
    label: "Gestures",
    items: ["👍", "👎", "👏", "🙌", "💪", "✌️", "🤞", "👉", "👈", "☝️", "✋", "🤝"],
  },
  {
    label: "Hearts & stars",
    items: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💖", "✨", "⭐", "🌟", "💫"],
  },
  {
    label: "Celebration",
    items: ["🎉", "🎊", "🎂", "🎁", "🎈", "🏆", "🥇", "🍾", "🎵", "🎶", "🔥", "💯"],
  },
  {
    label: "Nature & food",
    items: ["🌈", "☀️", "🌙", "⚡", "🌊", "🌸", "🌿", "🍕", "🍩", "☕", "🍓", "🥑"],
  },
  {
    label: "Objects & symbols",
    items: ["🚀", "💡", "📣", "📌", "✏️", "📷", "🎯", "⚙️", "✅", "❌", "➡️", "⬅️"],
  },
];

export const SWATCHES = [
  "#1c1917",
  "#ffffff",
  "#4f46e5",
  "#22d3ee",
  "#10b981",
  "#f59e0b",
  "#dc2626",
  "#ec4899",
  "#8b5cf6",
  "#0ea5e9",
  "#84cc16",
  "#f97316",
  "#64748b",
  "#f5f4f1",
];

interface Template {
  id: string;
  label: string;
  build: () => DesignDoc;
}

function quoteCard(): DesignDoc {
  const doc = createDesign("Quote card", 1080, 1080);
  doc.pages[0].background = "#1c1917";
  doc.pages[0].elements = [
    createShape(doc, "rect", {
      x: 60,
      y: 60,
      w: 960,
      h: 960,
      fill: "#00000000",
      stroke: "#4f46e5",
      strokeWidth: 6,
      radius: 24,
    }),
    createText(doc, {
      text: "“Simplicity is the soul of efficiency.”",
      x: 140,
      y: 380,
      w: 800,
      h: 240,
      fontSize: 72,
      bold: true,
      color: "#ffffff",
    }),
    createText(doc, {
      text: "— Austin Freeman",
      x: 140,
      y: 660,
      w: 800,
      h: 60,
      fontSize: 36,
      font: "body",
      color: "#22d3ee",
    }),
  ];
  return doc;
}

function youtubeThumbnail(): DesignDoc {
  const doc = createDesign("YouTube thumbnail", 1280, 720);
  doc.pages[0].background = "#4f46e5";
  doc.pages[0].elements = [
    createShape(doc, "rect", { x: -160, y: 440, w: 1600, h: 400, fill: "#1c1917", rotation: -6, radius: 0 }),
    createText(doc, {
      text: "BIG NEWS",
      x: 80,
      y: 120,
      w: 800,
      h: 160,
      fontSize: 130,
      bold: true,
      color: "#ffffff",
      align: "left",
    }),
    createText(doc, {
      text: "Everything you need to know in 10 minutes",
      x: 80,
      y: 500,
      w: 900,
      h: 120,
      fontSize: 52,
      font: "body",
      color: "#22d3ee",
      align: "left",
    }),
    createShape(doc, "star", { x: 1020, y: 100, w: 180, h: 180, fill: "#f59e0b", rotation: 15 }),
  ];
  return doc;
}

function storyAnnouncement(): DesignDoc {
  const doc = createDesign("Story announcement", 1080, 1920);
  doc.pages[0].background = "#f5f4f1";
  doc.pages[0].elements = [
    createShape(doc, "ellipse", { x: 690, y: -190, w: 700, h: 700, fill: "#22d3ee", opacity: 0.35 }),
    createShape(doc, "ellipse", { x: -260, y: 1450, w: 720, h: 720, fill: "#4f46e5", opacity: 0.25 }),
    createText(doc, {
      text: "SAVE THE DATE",
      x: 140,
      y: 560,
      w: 800,
      h: 80,
      fontSize: 44,
      font: "mono",
      color: "#4f46e5",
    }),
    createText(doc, {
      text: "Grand Opening",
      x: 90,
      y: 700,
      w: 900,
      h: 260,
      fontSize: 110,
      bold: true,
      color: "#1c1917",
    }),
    createText(doc, {
      text: "Saturday · August 12 · 6 PM",
      x: 140,
      y: 1020,
      w: 800,
      h: 70,
      fontSize: 44,
      font: "body",
      color: "#1c1917",
    }),
    createShape(doc, "line", { x: 440, y: 1180, w: 200, h: 8, fill: "#f59e0b" }),
  ];
  return doc;
}

function presentationTitle(): DesignDoc {
  const doc = createDesign("Presentation title", 1920, 1080);
  doc.pages[0].background = "#ffffff";
  doc.pages[0].elements = [
    createShape(doc, "rect", { x: 0, y: 0, w: 56, h: 1080, fill: "#4f46e5", radius: 0 }),
    createText(doc, {
      text: "Quarterly Review",
      x: 160,
      y: 380,
      w: 1300,
      h: 200,
      fontSize: 128,
      bold: true,
      align: "left",
      color: "#1c1917",
    }),
    createText(doc, {
      text: "Team performance, metrics and the road ahead",
      x: 160,
      y: 620,
      w: 1200,
      h: 90,
      fontSize: 52,
      font: "body",
      align: "left",
      color: "#64748b",
    }),
    createShape(doc, "triangle", { x: 1560, y: 720, w: 260, h: 240, fill: "#22d3ee", rotation: 90, opacity: 0.8 }),
  ];
  return doc;
}

function businessCard(): DesignDoc {
  const doc = createDesign("Business card", 1050, 600);
  doc.pages[0].background = "#1c1917";
  doc.pages[0].elements = [
    createShape(doc, "ellipse", { x: 780, y: -220, w: 500, h: 500, fill: "#4f46e5", opacity: 0.9 }),
    createText(doc, {
      text: "Alex Morgan",
      x: 80,
      y: 220,
      w: 600,
      h: 90,
      fontSize: 64,
      bold: true,
      align: "left",
      color: "#ffffff",
    }),
    createText(doc, {
      text: "Product Designer",
      x: 80,
      y: 320,
      w: 600,
      h: 50,
      fontSize: 34,
      font: "body",
      align: "left",
      color: "#22d3ee",
    }),
    createText(doc, {
      text: "alex@studio.com · +1 555 010 2030",
      x: 80,
      y: 470,
      w: 700,
      h: 40,
      fontSize: 28,
      font: "mono",
      align: "left",
      color: "#a8a29e",
    }),
  ];
  return doc;
}

function summerSale(): DesignDoc {
  const doc = createDesign("Summer sale", 1080, 1080);
  doc.pages[0].background = "#ec4899";
  doc.pages[0].backgroundGradient = { to: "#f59e0b", angle: 135 };
  doc.pages[0].elements = [
    createShape(doc, "ellipse", { x: 90, y: 90, w: 900, h: 900, fill: "#ffffff", opacity: 0.14 }),
    createText(doc, { text: "SUMMER", x: 140, y: 300, w: 800, h: 170, font: "bebas", fontSize: 170, color: "#ffffff", lineHeight: 1 }),
    createText(doc, { text: "SALE", x: 140, y: 460, w: 800, h: 210, font: "bebas", fontSize: 210, color: "#1c1917", lineHeight: 1 }),
    createText(doc, { text: "UP TO 50% OFF · THIS WEEK ONLY", x: 190, y: 740, w: 700, h: 50, font: "montserrat", fontSize: 34, bold: true, color: "#ffffff" }),
  ];
  return doc;
}

function eventFlyer(): DesignDoc {
  const doc = createDesign("Event flyer", 1080, 1920);
  doc.pages[0].background = "#0f172a";
  doc.pages[0].backgroundGradient = { to: "#0ea5e9", angle: 180 };
  doc.pages[0].elements = [
    createShape(doc, "line", { x: 440, y: 420, w: 200, h: 6, fill: "#22d3ee" }),
    createText(doc, { text: "LIVE & UNPLUGGED", x: 190, y: 480, w: 700, h: 60, font: "montserrat", fontSize: 38, bold: true, color: "#22d3ee" }),
    createText(doc, { text: "Jazz Nights", x: 90, y: 600, w: 900, h: 400, font: "playfair", fontSize: 150, italic: true, color: "#ffffff", lineHeight: 1.1 }),
    createText(doc, { text: "Friday, September 20 · 8 PM\nThe Blue Room, Downtown", x: 190, y: 1080, w: 700, h: 140, font: "body", fontSize: 44, color: "#e0f2fe", lineHeight: 1.5 }),
    createShape(doc, "rect", { x: 390, y: 1420, w: 300, h: 90, fill: "#22d3ee", radius: 45 }),
    createText(doc, { text: "FREE ENTRY", x: 390, y: 1445, w: 300, h: 40, font: "montserrat", fontSize: 30, bold: true, color: "#0f172a" }),
  ];
  return doc;
}

function podcastCover(): DesignDoc {
  const doc = createDesign("Podcast cover", 1080, 1080);
  doc.pages[0].background = "#1c1917";
  doc.pages[0].backgroundGradient = { to: "#4f46e5", angle: 135 };
  doc.pages[0].elements = [
    createShape(doc, "ellipse", { x: 340, y: 160, w: 400, h: 400, fill: "#00000000", stroke: "#22d3ee", strokeWidth: 10 }),
    createShape(doc, "ellipse", { x: 420, y: 240, w: 240, h: 240, fill: "#22d3ee", opacity: 0.9 }),
    createText(doc, { text: "🎙️", x: 465, y: 285, w: 150, h: 150, fontSize: 120, lineHeight: 1.2 }),
    createText(doc, { text: "Deep Dive", x: 140, y: 640, w: 800, h: 130, font: "poppins", fontSize: 104, bold: true, color: "#ffffff" }),
    createText(doc, { text: "A PODCAST ABOUT BIG IDEAS", x: 240, y: 800, w: 600, h: 45, font: "montserrat", fontSize: 30, bold: true, color: "#a5b4fc" }),
  ];
  return doc;
}

function motivationalPoster(): DesignDoc {
  const doc = createDesign("Motivational poster", 1240, 1754);
  doc.pages[0].background = "#1c1917";
  doc.pages[0].elements = [
    createShape(doc, "rect", { x: 80, y: 80, w: 1080, h: 1594, fill: "#00000000", stroke: "#f59e0b", strokeWidth: 4 }),
    createText(doc, { text: "DREAM", x: 170, y: 480, w: 900, h: 230, font: "bebas", fontSize: 230, color: "#ffffff", lineHeight: 1 }),
    createText(doc, { text: "BIG", x: 170, y: 700, w: 900, h: 330, font: "bebas", fontSize: 330, color: "#f59e0b", lineHeight: 1 }),
    createText(doc, { text: "then work for it", x: 270, y: 1120, w: 700, h: 110, font: "caveat", fontSize: 84, color: "#e7e5e4" }),
  ];
  return doc;
}

function birthdayCard(): DesignDoc {
  const doc = createDesign("Birthday card", 1600, 900);
  doc.pages[0].background = "#fbcfe8";
  doc.pages[0].backgroundGradient = { to: "#e0e7ff", angle: 135 };
  doc.pages[0].elements = [
    createText(doc, { text: "🎉", x: 160, y: 120, w: 180, h: 180, fontSize: 140, rotation: -15, lineHeight: 1.2 }),
    createText(doc, { text: "🎈", x: 1280, y: 560, w: 180, h: 180, fontSize: 140, rotation: 12, lineHeight: 1.2 }),
    createText(doc, { text: "Happy Birthday!", x: 200, y: 300, w: 1200, h: 220, font: "pacifico", fontSize: 150, color: "#db2777", lineHeight: 1.2 }),
    createText(doc, { text: "Wishing you the sweetest year yet", x: 400, y: 580, w: 800, h: 60, font: "body", fontSize: 44, color: "#6d28d9" }),
  ];
  return doc;
}

export const TEMPLATES: Template[] = [
  { id: "quote-card", label: "Quote card", build: quoteCard },
  { id: "yt-thumbnail", label: "YouTube thumbnail", build: youtubeThumbnail },
  { id: "story", label: "Story announcement", build: storyAnnouncement },
  { id: "presentation", label: "Presentation title", build: presentationTitle },
  { id: "business-card", label: "Business card", build: businessCard },
  { id: "summer-sale", label: "Summer sale", build: summerSale },
  { id: "event-flyer", label: "Event flyer", build: eventFlyer },
  { id: "podcast-cover", label: "Podcast cover", build: podcastCover },
  { id: "motivational", label: "Motivational poster", build: motivationalPoster },
  { id: "birthday-card", label: "Birthday card", build: birthdayCard },
];
