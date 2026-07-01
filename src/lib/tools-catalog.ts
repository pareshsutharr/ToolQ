export type ToolCategory = "pdf" | "image";

export interface ToolMeta {
  slug: string;
  category: ToolCategory;
  name: string;
  description: string;
  premium: "free" | "partial" | "premium";
  seoKeyword: string;
}

export const categories: { id: ToolCategory; label: string; description: string }[] = [
  { id: "pdf", label: "PDF Tools", description: "Merge, split, compress and convert PDFs" },
  { id: "image", label: "Image Tools", description: "Edit, convert and enhance images" },
];

export const tools: ToolMeta[] = [
  {
    slug: "merge",
    category: "pdf",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one ordered document.",
    premium: "partial",
    seoKeyword: "merge pdf online free",
  },
  {
    slug: "split",
    category: "pdf",
    name: "Split PDF",
    description: "Extract page ranges into separate PDF files.",
    premium: "partial",
    seoKeyword: "split pdf online",
  },
  {
    slug: "compress",
    category: "pdf",
    name: "Compress PDF",
    description: "Shrink PDF file size while preserving quality.",
    premium: "partial",
    seoKeyword: "compress pdf online",
  },
  {
    slug: "to-jpg",
    category: "pdf",
    name: "PDF to JPG",
    description: "Export every page as a high-quality JPG image.",
    premium: "free",
    seoKeyword: "pdf to jpg",
  },
  {
    slug: "to-text",
    category: "pdf",
    name: "PDF to Text",
    description: "Extract raw text content from any PDF.",
    premium: "free",
    seoKeyword: "pdf to text",
  },
  {
    slug: "rotate",
    category: "pdf",
    name: "Rotate PDF",
    description: "Fix sideways or upside-down pages.",
    premium: "free",
    seoKeyword: "rotate pdf",
  },
  {
    slug: "remove-background",
    category: "image",
    name: "Remove Background",
    description: "Instantly isolate a subject with AI — runs entirely in your browser.",
    premium: "partial",
    seoKeyword: "remove background from image",
  },
  {
    slug: "compress",
    category: "image",
    name: "Compress Image",
    description: "Reduce image file size with minimal quality loss.",
    premium: "partial",
    seoKeyword: "compress image online",
  },
  {
    slug: "resize",
    category: "image",
    name: "Resize Image",
    description: "Change image dimensions precisely or by percentage.",
    premium: "free",
    seoKeyword: "resize image online",
  },
  {
    slug: "convert",
    category: "image",
    name: "Convert Image Format",
    description: "Convert between JPG, PNG and WebP.",
    premium: "free",
    seoKeyword: "image format converter",
  },
  {
    slug: "to-pdf",
    category: "image",
    name: "Image to PDF",
    description: "Combine one or more images into a single PDF.",
    premium: "free",
    seoKeyword: "image to pdf converter",
  },
];

export function toolsByCategory(category: ToolCategory) {
  return tools.filter((t) => t.category === category);
}

export function findTool(category: ToolCategory, slug: string) {
  return tools.find((t) => t.category === category && t.slug === slug);
}
