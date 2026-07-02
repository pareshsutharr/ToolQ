import { findTool, type ToolCategory } from "@/lib/tools-catalog";

export interface BlogToolLink {
  category: ToolCategory;
  slug: string;
  reason: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishAt: string;
  updatedAt?: string;
  readMinutes: number;
  tags: string[];
  relatedTools: BlogToolLink[];
  sections: {
    heading: string;
    body: string[];
    steps?: string[];
    example?: string;
  }[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "compress-pdf-for-email-without-losing-quality",
    title: "How to Compress a PDF for Email Without Losing Quality",
    description:
      "A practical PDF compression workflow for resumes, invoices, forms and reports that are too large to send.",
    publishAt: "2026-07-02T00:00:00.000Z",
    readMinutes: 5,
    tags: ["PDF", "Compression", "Email"],
    relatedTools: [
      { category: "pdf", slug: "compress", reason: "Shrink the final PDF before sending." },
      { category: "pdf", slug: "to-jpg", reason: "Export pages as images when a preview is easier to share." },
      { category: "pdf", slug: "merge", reason: "Combine supporting files into one clean attachment." },
    ],
    sections: [
      {
        heading: "The problem",
        body: [
          "Email providers and job portals often reject PDFs above a small file limit. The risky fix is over-compressing until the document looks blurry or hard to read.",
          "A better workflow is to compress in one pass, review the result, and only then make deeper edits if the file is still too large.",
        ],
        example:
          "Example: a 14 MB portfolio PDF needs to fit under a 5 MB upload limit while keeping text and images readable.",
      },
      {
        heading: "The ToolQ workflow",
        body: [
          "Start with the Compress PDF tool, download the smaller file, and open it once before sending. If the pages are image-heavy, remove duplicate pages or split the document before compressing again.",
        ],
        steps: [
          "Open Compress PDF and drop in the large file.",
          "Download the compressed result.",
          "Check the first page, one image-heavy page, and the last page.",
          "If it is still too large, split optional pages into a second attachment or merge only the pages you actually need.",
        ],
      },
      {
        heading: "When to use another tool",
        body: [
          "If the PDF is a bundle of several files, merge only the final documents that matter. If someone only needs a visual preview, exporting a page to JPG can be smaller and easier to inspect.",
        ],
      },
    ],
  },
  {
    slug: "preview-markdown-before-publishing",
    title: "Preview Markdown Before Publishing: A Simple Checklist",
    description:
      "Use a live Markdown preview to catch broken headings, lists, links and formatting before sharing docs or README files.",
    publishAt: "2026-07-06T09:00:00.000Z",
    readMinutes: 4,
    tags: ["Markdown", "Developer Tools", "Writing"],
    relatedTools: [
      { category: "dev", slug: "markdown-preview", reason: "Write and preview Markdown side by side." },
      { category: "dev", slug: "url-encode", reason: "Clean URLs before adding them to docs." },
      { category: "dev", slug: "text-diff", reason: "Compare draft changes before publishing." },
    ],
    sections: [
      {
        heading: "Why preview matters",
        body: [
          "Markdown is easy to write, but small mistakes can make a public page look unfinished. A missing blank line can break a list. A copied URL can include spaces. A heading can be too deep for readers to scan.",
        ],
        example:
          "Example: before publishing a README, preview the install steps, links and code blocks exactly as a reader will see them.",
      },
      {
        heading: "The ToolQ workflow",
        body: [
          "Paste your Markdown into Markdown Preview and scan the rendered side first. Then read the source side to catch hidden mistakes like duplicate headings or malformed links.",
        ],
        steps: [
          "Paste the draft into Markdown Preview.",
          "Check that headings move from broad to specific.",
          "Click or inspect every link before publishing.",
          "Use Text Diff if you need to review changes between two versions.",
        ],
      },
    ],
  },
  {
    slug: "fix-json-before-sending-to-an-api",
    title: "How to Fix JSON Before Sending It to an API",
    description:
      "A fast way to format, validate and inspect JSON payloads before using them in API requests or webhooks.",
    publishAt: "2026-07-09T09:00:00.000Z",
    readMinutes: 5,
    tags: ["JSON", "API", "Developer Tools"],
    relatedTools: [
      { category: "dev", slug: "json-formatter", reason: "Pretty-print, minify and validate JSON." },
      { category: "dev", slug: "jwt-decoder", reason: "Inspect JSON Web Token payloads." },
      { category: "dev", slug: "base64", reason: "Decode encoded values inside payloads." },
    ],
    sections: [
      {
        heading: "Common JSON mistakes",
        body: [
          "Most JSON errors are tiny: a trailing comma, a missing quote, a nested object in the wrong place, or a value that should be a number but was sent as text.",
          "Formatting the payload before sending it makes the mistake visible.",
        ],
        example:
          "Example: a webhook fails because one field is named userEmail in one request and user_email in another.",
      },
      {
        heading: "The ToolQ workflow",
        body: [
          "Use JSON Formatter first. If the data includes tokens or encoded values, decode those separately instead of guessing what they contain.",
        ],
        steps: [
          "Paste the payload into JSON Formatter.",
          "Pretty-print it and scan the nesting.",
          "Validate before sending the request.",
          "Decode JWT or Base64 values only when you need to inspect their contents.",
        ],
      },
    ],
  },
  {
    slug: "resize-images-for-web-without-making-them-blurry",
    title: "Resize Images for the Web Without Making Them Blurry",
    description:
      "Pick practical image dimensions for web pages, profiles, thumbnails and uploads without destroying quality.",
    publishAt: "2026-07-13T09:00:00.000Z",
    readMinutes: 4,
    tags: ["Images", "Resize", "Web"],
    relatedTools: [
      { category: "image", slug: "resize", reason: "Change width, height or scale precisely." },
      { category: "image", slug: "compress", reason: "Reduce file size after resizing." },
      { category: "image", slug: "convert", reason: "Convert between JPG, PNG and WebP." },
    ],
    sections: [
      {
        heading: "Start with the final use",
        body: [
          "A hero image, product thumbnail and profile photo should not use the same dimensions. Resize for where the image will live, then compress the finished version.",
        ],
        example:
          "Example: use a wide image for a page banner, a square crop for an avatar, and a smaller compressed file for email.",
      },
      {
        heading: "The ToolQ workflow",
        body: [
          "Resize first, compress second, convert format last. This keeps the image predictable and avoids repeated quality loss.",
        ],
        steps: [
          "Open Resize Image and set the target width or percentage.",
          "Download the resized image.",
          "Run Compress Image if the file is still too large.",
          "Convert to WebP for web use when compatibility is acceptable.",
        ],
      },
    ],
  },
  {
    slug: "convert-unix-timestamps-for-logs-and-debugging",
    title: "Convert Unix Timestamps When Debugging Logs",
    description:
      "Turn Unix timestamps into readable dates so logs, webhook events and database records are easier to understand.",
    publishAt: "2026-07-16T09:00:00.000Z",
    readMinutes: 4,
    tags: ["Timestamp", "Debugging", "Developer Tools"],
    relatedTools: [
      { category: "dev", slug: "timestamp-converter", reason: "Convert Unix time to readable dates and back." },
      { category: "dev", slug: "json-formatter", reason: "Format log payloads before reading them." },
      { category: "dev", slug: "text-diff", reason: "Compare logs from two failed requests." },
    ],
    sections: [
      {
        heading: "Why timestamps slow debugging down",
        body: [
          "Logs often store time as Unix seconds or milliseconds. That is great for machines and painful for humans, especially when you are comparing events across services.",
        ],
        example:
          "Example: compare a payment webhook timestamp with the time your backend created the user record.",
      },
      {
        heading: "The ToolQ workflow",
        body: [
          "Convert the timestamp, confirm whether it is seconds or milliseconds, then compare it with the local time shown in your logs or dashboard.",
        ],
        steps: [
          "Paste the timestamp into Timestamp Converter.",
          "Switch between seconds and milliseconds if the date looks wrong.",
          "Copy the readable date into your debugging notes.",
          "Format related JSON logs so the timestamp sits next to the event fields.",
        ],
      },
    ],
  },
  {
    slug: "make-a-qr-code-for-a-link-without-extra-setup",
    title: "Make a QR Code for a Link Without Extra Setup",
    description:
      "Create a simple QR code for menus, forms, portfolios, feedback pages and event links.",
    publishAt: "2026-07-20T09:00:00.000Z",
    readMinutes: 4,
    tags: ["QR Code", "Generator", "Marketing"],
    relatedTools: [
      { category: "generators", slug: "qr-code", reason: "Create a scannable QR code from a URL or text." },
      { category: "dev", slug: "url-encode", reason: "Clean query parameters before generating a QR code." },
      { category: "image", slug: "resize", reason: "Resize the exported QR image for print or web." },
    ],
    sections: [
      {
        heading: "Use clean links",
        body: [
          "A QR code is only as good as the link behind it. Long links with spaces, broken tracking parameters or temporary URLs create bad scans.",
        ],
        example:
          "Example: turn a feedback form URL into a QR code for a flyer, then test it with your phone before printing.",
      },
      {
        heading: "The ToolQ workflow",
        body: [
          "Clean the link, generate the QR code, test it, then resize the image if it needs to fit a design.",
        ],
        steps: [
          "Paste the final URL into QR Code Generator.",
          "Download the QR image.",
          "Scan it with a phone camera.",
          "Resize the image only after you know the QR code works.",
        ],
      },
    ],
  },
  {
    slug: "create-a-strong-password-for-new-accounts",
    title: "Create a Strong Password for New Accounts",
    description:
      "Generate strong passwords for new accounts without reusing old passwords or inventing weak patterns.",
    publishAt: "2026-07-23T09:00:00.000Z",
    readMinutes: 4,
    tags: ["Password", "Security", "Generator"],
    relatedTools: [
      { category: "generators", slug: "password", reason: "Generate strong random passwords." },
      { category: "generators", slug: "uuid-generator", reason: "Generate random IDs for test data." },
      { category: "dev", slug: "hash-generator", reason: "Generate checksums and hashes for developer workflows." },
    ],
    sections: [
      {
        heading: "Avoid memorable patterns",
        body: [
          "A password based on a pet name, date or keyboard pattern is easier to guess than it looks. The safer habit is generating a unique random password for every important account.",
        ],
        example:
          "Example: generate a new password for an admin account, save it in a password manager, and never reuse it elsewhere.",
      },
      {
        heading: "The ToolQ workflow",
        body: [
          "Use Password Generator to create a password that is long enough for the account rules, then store it immediately.",
        ],
        steps: [
          "Open Password Generator.",
          "Choose a length of at least 16 characters when possible.",
          "Include symbols only if the service accepts them.",
          "Save the password in your password manager before closing the page.",
        ],
      },
    ],
  },
  {
    slug: "split-a-large-pdf-into-clean-sections",
    title: "Split a Large PDF Into Clean Sections",
    description:
      "Break a large PDF into smaller sections for applications, client reviews, invoices and document packets.",
    publishAt: "2026-07-27T09:00:00.000Z",
    readMinutes: 5,
    tags: ["PDF", "Split", "Documents"],
    relatedTools: [
      { category: "pdf", slug: "split", reason: "Extract page ranges into separate files." },
      { category: "pdf", slug: "extract-pages", reason: "Pull specific pages into a new PDF." },
      { category: "pdf", slug: "remove-pages", reason: "Delete pages that should not be shared." },
    ],
    sections: [
      {
        heading: "Why smaller PDFs work better",
        body: [
          "Large PDFs are harder to review, slower to upload and easier to share with the wrong pages included. Splitting a file into clean sections gives each recipient only what they need.",
        ],
        example:
          "Example: split a 40-page application packet into identity documents, bank statements and signed forms.",
      },
      {
        heading: "The ToolQ workflow",
        body: [
          "Decide the page ranges before uploading. Then split, name the output files clearly, and remove any pages that should not be shared.",
        ],
        steps: [
          "Open the PDF and note the page ranges you need.",
          "Use Split PDF to extract those ranges.",
          "Use Remove Pages for any accidental extras.",
          "Compress the final files if an upload limit applies.",
        ],
      },
    ],
  },
];

export function getPublishedBlogPosts(now = new Date()) {
  return blogPosts
    .filter((post) => new Date(post.publishAt) <= now)
    .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());
}

export function getBlogPost(slug: string, now = new Date()) {
  return getPublishedBlogPosts(now).find((post) => post.slug === slug);
}

export function getBlogTool(tool: BlogToolLink) {
  return findTool(tool.category, tool.slug);
}
