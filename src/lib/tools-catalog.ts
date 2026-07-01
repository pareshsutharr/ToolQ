export type ToolCategory = "pdf" | "image";
export type ToolGroup = "organize" | "optimize" | "convert" | "edit" | "security" | "ai";

export interface ToolMeta {
  slug: string;
  category: ToolCategory;
  group: ToolGroup;
  name: string;
  description: string;
  premium: "free" | "partial" | "premium";
  seoKeyword: string;
}

export const categories: { id: ToolCategory; label: string; description: string }[] = [
  { id: "pdf", label: "PDF Tools", description: "Merge, split, compress and convert PDFs" },
  { id: "image", label: "Image Tools", description: "Edit, convert and enhance images" },
];

export const groupLabels: Record<ToolGroup, string> = {
  organize: "Organize",
  optimize: "Optimize",
  convert: "Convert",
  edit: "Edit",
  security: "Security",
  ai: "AI",
};

export const tools: ToolMeta[] = [
  {
    slug: "merge",
    category: "pdf",
    group: "organize",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one ordered document.",
    premium: "partial",
    seoKeyword: "merge pdf online free",
  },
  {
    slug: "split",
    category: "pdf",
    group: "organize",
    name: "Split PDF",
    description: "Extract page ranges into separate PDF files.",
    premium: "partial",
    seoKeyword: "split pdf online",
  },
  {
    slug: "remove-pages",
    category: "pdf",
    group: "organize",
    name: "Remove Pages",
    description: "Delete specific pages from a PDF.",
    premium: "free",
    seoKeyword: "remove pages from pdf",
  },
  {
    slug: "extract-pages",
    category: "pdf",
    group: "organize",
    name: "Extract Pages",
    description: "Pull specific pages out into a new PDF.",
    premium: "free",
    seoKeyword: "extract pages from pdf",
  },
  {
    slug: "organize",
    category: "pdf",
    group: "organize",
    name: "Organize PDF",
    description: "Reorder, rotate, or delete pages in one view.",
    premium: "free",
    seoKeyword: "organize pdf pages",
  },
  {
    slug: "compress",
    category: "pdf",
    group: "optimize",
    name: "Compress PDF",
    description: "Shrink PDF file size while preserving quality.",
    premium: "partial",
    seoKeyword: "compress pdf online",
  },
  {
    slug: "repair",
    category: "pdf",
    group: "optimize",
    name: "Repair PDF",
    description: "Attempt to fix a corrupted or malformed PDF.",
    premium: "free",
    seoKeyword: "repair corrupted pdf",
  },
  {
    slug: "ocr",
    category: "pdf",
    group: "optimize",
    name: "OCR PDF",
    description: "Make a scanned PDF searchable and selectable.",
    premium: "partial",
    seoKeyword: "ocr pdf online",
  },
  {
    slug: "to-jpg",
    category: "pdf",
    group: "convert",
    name: "PDF to JPG",
    description: "Export every page as a high-quality JPG image.",
    premium: "free",
    seoKeyword: "pdf to jpg",
  },
  {
    slug: "to-text",
    category: "pdf",
    group: "convert",
    name: "PDF to Text",
    description: "Extract raw text content from any PDF.",
    premium: "free",
    seoKeyword: "pdf to text",
  },
  {
    slug: "excel-to-pdf",
    category: "pdf",
    group: "convert",
    name: "Excel to PDF",
    description: "Render a spreadsheet as a paginated PDF table.",
    premium: "free",
    seoKeyword: "excel to pdf converter",
  },
  {
    slug: "to-excel",
    category: "pdf",
    group: "convert",
    name: "PDF to Excel",
    description: "Extract text and tables into a spreadsheet.",
    premium: "partial",
    seoKeyword: "pdf to excel converter",
  },
  {
    slug: "rotate",
    category: "pdf",
    group: "edit",
    name: "Rotate PDF",
    description: "Fix sideways or upside-down pages.",
    premium: "free",
    seoKeyword: "rotate pdf",
  },
  {
    slug: "page-numbers",
    category: "pdf",
    group: "edit",
    name: "Add Page Numbers",
    description: "Number every page, positioned however you like.",
    premium: "free",
    seoKeyword: "add page numbers to pdf",
  },
  {
    slug: "watermark",
    category: "pdf",
    group: "edit",
    name: "Add Watermark",
    description: "Overlay diagonal text across every page.",
    premium: "free",
    seoKeyword: "add watermark to pdf",
  },
  {
    slug: "crop",
    category: "pdf",
    group: "edit",
    name: "Crop PDF",
    description: "Trim page margins, previewed before you commit.",
    premium: "free",
    seoKeyword: "crop pdf pages",
  },
  {
    slug: "fill-form",
    category: "pdf",
    group: "edit",
    name: "Fill PDF Form",
    description: "Fill in an interactive PDF form's fields.",
    premium: "free",
    seoKeyword: "fill pdf form online",
  },
  {
    slug: "sign",
    category: "pdf",
    group: "security",
    name: "Sign PDF",
    description: "Draw a signature and place it on the page.",
    premium: "free",
    seoKeyword: "sign pdf online",
  },
  {
    slug: "compare",
    category: "pdf",
    group: "security",
    name: "Compare PDF",
    description: "See what changed between two versions of a document.",
    premium: "partial",
    seoKeyword: "compare pdf documents",
  },
  {
    slug: "unlock",
    category: "pdf",
    group: "security",
    name: "Unlock PDF",
    description: "Remove password protection from a PDF.",
    premium: "free",
    seoKeyword: "unlock pdf remove password",
  },
  {
    slug: "summarize",
    category: "pdf",
    group: "ai",
    name: "AI Summarizer",
    description: "Condense a PDF into key points — runs entirely in your browser.",
    premium: "premium",
    seoKeyword: "ai pdf summarizer",
  },
  {
    slug: "translate",
    category: "pdf",
    group: "ai",
    name: "Translate PDF",
    description: "Translate a PDF's text — runs entirely in your browser.",
    premium: "premium",
    seoKeyword: "translate pdf online",
  },
  {
    slug: "remove-background",
    category: "image",
    group: "ai",
    name: "Remove Background",
    description: "Instantly isolate a subject with AI — runs entirely in your browser.",
    premium: "partial",
    seoKeyword: "remove background from image",
  },
  {
    slug: "compress",
    category: "image",
    group: "optimize",
    name: "Compress Image",
    description: "Reduce image file size with minimal quality loss.",
    premium: "partial",
    seoKeyword: "compress image online",
  },
  {
    slug: "resize",
    category: "image",
    group: "edit",
    name: "Resize Image",
    description: "Change image dimensions precisely or by percentage.",
    premium: "free",
    seoKeyword: "resize image online",
  },
  {
    slug: "convert",
    category: "image",
    group: "convert",
    name: "Convert Image Format",
    description: "Convert between JPG, PNG and WebP.",
    premium: "free",
    seoKeyword: "image format converter",
  },
  {
    slug: "to-pdf",
    category: "image",
    group: "convert",
    name: "Image to PDF",
    description: "Combine one or more images into a single PDF.",
    premium: "free",
    seoKeyword: "image to pdf converter",
  },
];

export function toolsByCategory(category: ToolCategory) {
  return tools.filter((t) => t.category === category);
}

export function toolsByCategoryGrouped(category: ToolCategory) {
  const items = toolsByCategory(category);
  const groups = new Map<ToolGroup, ToolMeta[]>();
  for (const tool of items) {
    const list = groups.get(tool.group) ?? [];
    list.push(tool);
    groups.set(tool.group, list);
  }
  return Array.from(groups.entries()).map(([group, toolsInGroup]) => ({
    group,
    label: groupLabels[group],
    tools: toolsInGroup,
  }));
}

export function findTool(category: ToolCategory, slug: string) {
  return tools.find((t) => t.category === category && t.slug === slug);
}
