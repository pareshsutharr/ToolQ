# ToolQ — Project Overview

A single source of truth for what ToolQ is, how it's built, and every feature it currently ships. Written 2026-07-24. The high-level pitch: **a free, all-in-one online toolbox (PDF, image, developer, generator, and calculator tools) that runs almost entirely in the visitor's browser** — most tools need no account and upload nothing to a server.

For the SEO/deploy checklist and blog publishing cadence, see [README.md](README.md). This file covers everything else.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS v3.4 with a custom token palette (not shadcn — see §9) |
| Auth / DB | Supabase (`@supabase/ssr` + `@supabase/supabase-js`) — Postgres + RLS, email/password auth |
| PDF engine | `pdf-lib` (create/edit/sign/merge/split) + `pdfjs-dist` (render/parse/OCR source) |
| Spreadsheets | `xlsx` (SheetJS) — CSV/XLSX read & write, used by 3 PDF↔Excel tools |
| DOCX export | `docx` v9 (builds real `.docx` client-side) |
| OCR | `tesseract.js` (local, in-browser, no API key) |
| AI (where used) | `@anthropic-ai/sdk` — Claude, used only by two premium tools via one server API route |
| Background removal | `@huggingface/transformers` + `@imgly/background-removal` (in-browser ML) |
| Icons | `lucide-react` (primary), `react-icons` (brand icons for the Design gallery) |
| Zipping | `jszip` (multi-file tool results bundled as `.zip`) |
| Carousels | `embla-carousel-react` + `embla-carousel-auto-scroll` (homepage format marquee) |
| Linting | ESLint 9 (`eslint-config-next`) |
| Hosting assumption | Single Next.js deployment, `www.toolq.online` canonical (redirect-enforced in middleware) |

No server object storage, no job queues, no cloud OCR/AI workers — deliberately. The one exception is `/api/doc-ai/reconstruct`, a single Next.js API route that proxies to Claude for the two AI PDF tools (Summarize, Translate) and for the optional "Rebuild with AI" path inside the PDF editor.

---

## 2. Repository layout

```
src/
  app/                    Next.js App Router pages
    tools/[category]/     Dynamic category listing page (pdf/image/dev/generators/calculators)
    tools/<category>/<slug>/   Each tool: page.tsx (SEO/metadata) + client.tsx (the actual tool)
    design/                Design Space (Canva-style editor) — see §6
    admin/                 Internal admin dashboard (allowlisted emails only)
    account/               Signed-in user's account page
    sign-in/ sign-up/ forgot-password/ reset-password/   Auth pages
    blog/                  SEO content — scheduled publishing
    pricing/               Free vs Premium plan page
    api/account/delete/    Account deletion endpoint
    api/doc-ai/reconstruct/  Claude-backed reconstruction endpoint (used by 3 premium features)
    sitemap.ts, robots.txt, opengraph-image, manifest.webmanifest
  components/             Shared UI: ToolShell, Dropzone, ResultList, Header, MegaMenu, Footer, …
    ui/                   shadcn-derived primitives adapted to ToolQ's own design tokens
  lib/
    tools-catalog.ts      Single source of truth for every tool (drives nav, sitemap, SEO, admin)
    doc-model/            The PDF Editor's document model, OCR pipeline, exporters, versioning
    design/               The Design Space's data model, renderer, storage, presets
    supabase/             Client/server/middleware Supabase helpers
    seo.ts                Metadata + JSON-LD builders
    blog.ts               Blog post content + scheduled-publish filtering
    profile.ts            Current user + plan lookup (auth-aware, degrades gracefully)
    admin.ts              Admin-email allowlist check
    pdfjs.ts, pdf-text.ts, image.ts, transformers.ts, tool-icons.tsx, utils.ts
supabase/migrations/      SQL migrations (profiles table, site_stats table)
scripts/verify-seo.mjs    Post-deploy SEO/canonical check (also runs daily via GitHub Actions)
```

**Per-tool convention:** every tool at `/tools/<category>/<slug>` is two files — `page.tsx` (server component: metadata, JSON-LD, breadcrumbs) wrapping `client.tsx` (`"use client"`: the actual Dropzone → process → `ResultList` flow). Adding a tool is: one entry in `tools-catalog.ts` + one folder. That single catalog entry automatically produces the tool's card on its category page, its sitemap URL, its SEO metadata, and its row in the admin table.

---

## 3. The tool catalog — 53 tools across 5 categories

Everything lives in [src/lib/tools-catalog.ts](src/lib/tools-catalog.ts). Each tool has a `premium` tier:

- **Free** — fully open, no account.
- **Free + Pro** (`"partial"` in code) — usable free today; earmarked for a future limits/upgrade split. Currently *not* hard-gated by any code path except the two tools below.
- **Pro** (`"premium"` in code) — hard-gated behind Supabase auth + `profiles.plan = 'premium'` via the `<PremiumGuard>` server component. Only **2 tools** are actually gated this way: `pdf/summarize` and `pdf/translate`.

Current split: **41 Free · 10 Free+Pro · 2 Pro**.

### PDF Tools (24) — `/tools/pdf`

| Tool | Slug | What it does |
|---|---|---|
| Merge PDF | `merge` | Combine multiple PDFs into one ordered document (drag to reorder) |
| Split PDF | `split` | Extract page ranges, or split every page into its own file |
| Remove Pages | `remove-pages` | Delete specific pages |
| Extract Pages | `extract-pages` | Pull specific pages into a new PDF |
| Organize PDF | `organize` | Reorder / rotate / delete pages in one view |
| Compress PDF | `compress` | Shrink file size while preserving quality |
| Repair PDF | `repair` | Attempt to fix a corrupted/malformed PDF |
| OCR PDF | `ocr` | Make a scanned PDF searchable (Tesseract.js, local) |
| PDF to JPG | `to-jpg` | Export every page as a JPG |
| PDF to Text | `to-text` | Extract raw text |
| Excel to PDF | `excel-to-pdf` | Render a spreadsheet (.xlsx/.xls/.csv) as a paginated PDF table |
| PDF to Excel | `to-excel` | Reconstruct rows/columns from a PDF's layout into a spreadsheet |
| **CSV to Excel** | `csv-to-excel` | **New.** Multi-file CSV→XLSX with delimiter auto-detect, live preview, leading-zero-safe text mode, combined-workbook or separate-files output — see §4 |
| Rotate PDF | `rotate` | Fix sideways/upside-down pages |
| **Edit PDF** | `edit` | Full structured document editor — see §5 |
| Add Page Numbers | `page-numbers` | Numbering with position control |
| Add Watermark | `watermark` | Diagonal text overlay on every page |
| Crop PDF | `crop` | Trim margins with a live preview |
| Fill PDF Form | `fill-form` | Fill interactive AcroForm fields |
| Sign PDF | `sign` | Draw a signature (canvas) and place it |
| Compare PDF | `compare` | Line-level diff between two PDF versions |
| Unlock PDF | `unlock` | Remove password protection |
| AI Summarizer 🔒 | `summarize` | Claude-backed key-point summary — **Pro only** |
| Translate PDF 🔒 | `translate` | Claude-backed translation — **Pro only** |

### Image Tools (6) — `/tools/image`

| Tool | Slug | What it does |
|---|---|---|
| Remove Background | `remove-background` | In-browser ML background removal (`@imgly/background-removal`) |
| Compress Image | `compress` | Reduce file size, minimal quality loss |
| Resize Image | `resize` | Precise dimensions or percentage scaling |
| Convert Image Format | `convert` | JPG ⇄ PNG ⇄ WebP |
| Image to PDF | `to-pdf` | Combine one or more images into a single PDF |
| Image to Text (OCR) | `to-text` | Extract text from a photo/screenshot, edit, export |

### Developer Tools (11) — `/tools/dev`

JSON Formatter (`json-formatter`) · Base64 Encode/Decode (`base64`) · URL Encode/Decode (`url-encode`) · Hash Generator — MD5/SHA-1/256/512 (`hash-generator`) · UUID Generator (`uuid-generator`) · JWT Decoder (`jwt-decoder`) · Regex Tester (`regex-tester`) · Text Diff Checker (`text-diff`) · Markdown Preview (`markdown-preview`) · Timestamp Converter (`timestamp-converter`) · Color Converter — HEX/RGB/HSL (`color-converter`). All instant/synchronous, no loading states needed.

### Generators (6) — `/tools/generators`

QR Code Generator (`qr-code`) · Barcode Generator (`barcode`) · Password Generator (`password`) · Random Number Generator (`random-number`) · Avatar Generator — geometric identicons (`avatar`) · Fake Data Generator — names/emails/addresses (`fake-data`).

### Calculators (6) — `/tools/calculators`

Percentage (`percentage`) · BMI (`bmi`) · Age / date difference (`age`) · Loan / EMI (`loan-emi`) · Unit Converter — length/weight/temperature (`unit-converter`) · Tip / bill split (`tip`).

---

## 4. CSV to Excel (newest tool, added 2026-07-24)

`/tools/pdf/csv-to-excel` — [client.tsx](src/app/tools/pdf/csv-to-excel/client.tsx). Built to be the most complete CSV→Excel converter on the site:

- **Multi-file upload** — convert several CSVs in one go.
- **Delimiter auto-detection** (comma / semicolon / tab / pipe) with a per-file manual override, so European semicolon-CSVs and TSVs work without configuration.
- **Proper CSV parsing** via SheetJS — quoted fields with embedded commas and escaped quotes parse correctly, not a naive `split(",")`.
- **Live preview table** per file (first 5 rows) so a wrong delimiter is obvious before converting.
- **"Keep everything as text" toggle** — avoids the classic CSV→Excel gotcha where `"007"` silently becomes `7`; preserves leading zeros, ID codes, and anything else that shouldn't be reinterpreted.
- **Skip empty rows** toggle.
- **Header row → Excel autofilter** on export.
- **Auto column widths** sized to content.
- **Two output modes** for multi-file batches: one workbook with a sheet per file, or separate `.xlsx` files (downloadable individually or as a `.zip` via the shared `ResultList` component).
- **Sheet-name sanitization** — strips characters Excel disallows, truncates to Excel's 31-character limit, dedupes collisions (`Sheet`, `Sheet (2)`, …).
- **Per-file error handling** — empty/unreadable/unparseable files are flagged and skipped rather than failing the whole batch.
- 100% client-side; nothing is uploaded.

---

## 5. Edit PDF — the structured document editor

`/tools/pdf/edit` — by far the most complex tool. A full in-browser document editor, not just a form-filler. Lives in `src/lib/doc-model/` (model/logic) + `src/app/tools/pdf/edit/` (UI).

**Document model** (`src/lib/doc-model/`): a versioned JSON schema (`DOCUMENT_MODEL_VERSION` + a `migrateToLatest` seam for future format changes) — blocks (heading/paragraph/list/table/image/signature) with stable IDs, per-page import from either a searchable or scanned PDF, autosaved to IndexedDB as you type.

**Import & OCR:** `import-pdf.ts` splits pages into "has a text layer" vs "scanned." Scanned pages get flagged and OCR'd via `tesseract.js` (fully local, `src/lib/doc-model/ocr/`) — a provider-registry pattern (`OcrProvider` interface) so another OCR backend could be swapped in later. OCR runs automatically after import, with a manual "Retry OCR" fallback (both now show a spinner while running).

**Structured editing:** inline `contentEditable` text blocks, an editable `TableBlockEditor` (add/delete rows & columns), `ImageBlockEditor` (insert image, resize, caption), and a canvas `SignaturePad`. Per-block move-up/down/delete controls, plus a per-page "Add block" menu.

**Three view modes:** `source` (original scanned page, only edits painted as whiteout patches), `rebuild` (reconstructed flowing document), `text` (linear plain-text cleanup — reflows wrapped lines, de-hyphenates line breaks, flattens lists/tables to text, drops images — deliberately destructive but undoable via version history).

**Export:** PDF (via `pdf-lib`, draws tables/images/signatures), DOCX (via the `docx` package — headings, runs, bullet/numbered lists, real tables, embedded images, all client-side, lazy-loaded so the heavy `docx` dep doesn't bloat the base route), plain text, HTML, and the raw JSON model.

**Version history:** append-only snapshots in IndexedDB (`versions.ts`) with save/restore/compare (line diff via the `diff` package)/duplicate/rename/delete, and automatic retention pruning (keep everything under 30 days, thin older snapshots to one-per-day).

**Find & Replace:** full editor-grade implementation — live "X of Y" match counter, prev/next navigation with wraparound, case-sensitive/whole-word/regex toggles, `Ctrl/Cmd+F` to open, selects matches in the live DOM via the Selection API.

**"Rebuild with AI"** (optional, Pro-adjacent): sends a page image to `/api/doc-ai/reconstruct`, which calls Claude with a forced structured-output tool call to re-derive editable blocks from a page image — used when OCR/heuristic reconstruction quality isn't good enough. This is the *only* place in the whole document-editing pipeline that touches a network call; everything else in the editor is 100% local processing.

**iLovePDF-style UI:** hero upload screen, polished importing/progress states, a `ToolbarButton`/`ToolbarMenu` toolbar system, and a single "Download ▾" menu replacing separate export buttons.

---

## 6. Design Space — Canva-style design editor

`/design` (gallery) and `/design/[id]` (editor, `noindex`ed). Fully client-side, no uploads, no AI — same local-first philosophy as the PDF editor.

- **Model:** `src/lib/design/types.ts` — a `DesignDoc` with `pages[]`, each page holding background (solid or gradient) + a flat z-ordered list of text/shape/image elements. Everything is JSON-serializable.
- **Storage:** IndexedDB (`toolq-design-space` DB) via `src/lib/design/storage.ts`; `migrateDesign()` upgrades legacy single-page docs on read.
- **Rendering/export:** `src/lib/design/render.ts` — one canvas renderer shared by PNG/JPEG export, PDF export (via `pdf-lib`; exports all pages), and gallery thumbnails.
- **Editor** (`src/app/design/[id]/EditorClient.tsx` + `panels.tsx`): drag/resize/rotate with rotation-aware math, inline textarea text editing, coalesced undo/redo, autosave (~900ms debounce) with thumbnail regeneration, keyboard shortcuts, snap-to-center/edge alignment guides.
- **Content:** tabbed left rail (Text / Shapes / Photos / Graphics / Uploads), 10 starter templates, stock photos from Lorem Picsum (no API key, embedded as data URLs), emoji sticker graphics, gradient background presets, ~18 fonts (Google Fonts, lazy-loaded via an injected stylesheet only when used).
- **Sizing:** preset canvas sizes plus custom width/height, with a resize popover that can scale existing content to the new size.
- **Gallery:** search across templates + saved designs, circular preset-size chips, gradient hero section.

---

## 7. Accounts, auth & the Premium plan

Supabase-backed, and designed to **degrade gracefully when Supabase isn't configured** — `isSupabaseConfigured()` gates every auth-dependent code path so the rest of the site (all free tools) works with zero backend.

- **Auth pages:** `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/auth/callback` (OAuth/email callback route), `/account` (view profile, delete account via `/api/account/delete`).
- **Canonical redirect + session refresh:** `src/middleware.ts` force-redirects `toolq.online` / non-HTTPS / non-`www` traffic to `https://www.toolq.online` (301), then delegates to `updateSession()` (Supabase SSR cookie refresh) for everything else.
- **`profiles` table** (migration `0001_profiles.sql`): one row per auth user (`id`, `email`, `plan` — `free`/`premium`), RLS-protected (owner can read/update their own row only), auto-created on signup via an `on_auth_user_created` trigger, and — importantly — a `protect_profile_plan` trigger that silently reverts any attempt by an authenticated user's own client to write a new `plan` value into their own row. Upgrading to premium currently requires a back-office/service-role write (there's no billing integration yet — the pricing page's "Upgrade" CTA is a `mailto:` link).
- **Gating:** `getCurrentUser()` (`src/lib/profile.ts`) reads the session + plan, defaulting to `null`/`"free"` on any failure (missing config, un-migrated table) rather than throwing. `<PremiumGuard category slug>` wraps a tool's page content and swaps in `<PremiumLock>` unless `plan === "premium"`. Only `pdf/summarize` and `pdf/translate` use this guard today.
- **Admin panel** (`/admin`): allowlisted by email via `ADMIN_EMAILS` (comma-separated env var, checked in `src/lib/admin.ts`). Shows free/partial/premium tool counts, sitemap URL count, a link to the Supabase Auth users dashboard, and a searchable/filterable table of every tool (`AdminToolsTable.tsx`). Not indexed (`robots: noindex`).

---

## 8. Other site features

- **Visitor counter** (`src/components/VisitorCounter.tsx`, homepage hero): live "N visits and counting" pill with an eased count-up animation. Increments a shared Supabase counter once per browser session (via a `SECURITY DEFINER` RPC, `increment_visits()`, so anonymous clients can bump the count without direct table-write access) — migration `0002_site_stats.sql`. Renders nothing until a real number loads; never shows a fabricated figure; silently stays hidden if Supabase isn't configured or the migration hasn't been applied.
- **Blog** (`/blog`, `/blog/[slug]`): SEO content system in `src/lib/blog.ts` — each post has a `publishAt` timestamp; the index, article pages, and sitemap only expose posts whose publish date has already passed, so posts publish themselves automatically after deploy. Current schedule: 104 posts, Monday & Thursday 09:00 UTC (one year's cadence at 2 posts/week). Posts link to relevant tools (`relatedTools`) for internal linking.
- **SEO** (`src/lib/seo.ts`): per-tool and per-category metadata builders (title-casing that preserves acronyms like PDF/JWT/UUID), JSON-LD, Open Graph/Twitter cards, canonical URLs. `scripts/verify-seo.mjs` (run via `npm run seo:check`, also daily via GitHub Actions) checks the canonical-host redirect, homepage canonical/OG/JSON-LD, `robots.txt`, and that every sitemap URL uses the canonical host.
- **Pricing** (`/pricing`): Free vs Premium comparison; Premium lists the 2 AI-gated tools; upgrade CTA is currently a `mailto:` (no billing integration yet).
- **Homepage:** hero, live visitor counter, an auto-scrolling file-format marquee (Embla-powered, `src/components/ui/logos3.tsx`), tool category grid, search (`SearchBar.tsx`, powered by `fuse.js` fuzzy search over the tool catalog), `MegaMenu` header navigation.

---

## 9. Design system

- **Not shadcn** — ToolQ has its own Tailwind v3.4 token palette (`node-blue`, `deep-ink`, `surface`, `ink`, `flag-red`, `spark-lime`, `amber`, `panel`, `signal-violet`), defined as CSS variables in `globals.css` with light/dark values. `src/components/ui/` holds a few shadcn-derived primitives (carousel, logo marquee) that were manually adapted to these tokens (shadcn semantic classes and Tailwind v4 syntax swapped out) rather than a wholesale shadcn install.
- **Shared building blocks:** `ToolShell` (title/description wrapper every tool page uses), `Dropzone` (drag-and-drop file input, `default` and `hero` variants), `ResultList` (download UI for one or many output files, with automatic "download all as .zip" for multi-file results), `.btn-primary` / `.btn-secondary` / `.card` utility classes.
- **Loading convention:** `Loader2` from `lucide-react` with Tailwind's `animate-spin`, sized `h-3.5 w-3.5` to `h-5 w-5` depending on context, paired with `gap-1.5`/`gap-2` on the flex container. As of 2026-07-24 this spinner is wired into **every tool with genuine async work** — all file-processing PDF/image tools (28 tool buttons across the PDF and Image categories, including the new CSV to Excel tool's library-load and conversion states), plus the PDF editor's AI-rebuild, OCR-retry, and version-save actions. Instant/synchronous tools (calculators, dev formatters, generators) intentionally have no loading state — there's nothing to wait for.

---

## 10. Environment & setup

Copy `.env.local.example` → `.env.local` and fill in:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project — powers auth, profiles, visitor counter. Site works without these; auth-dependent features just stay inactive. |
| `ADMIN_EMAILS` | Comma-separated emails allowed into `/admin`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, enables account deletion (and future admin operations). Never expose to the client. |

Apply `supabase/migrations/0001_profiles.sql` and `0002_site_stats.sql` to activate auth/profiles and the visitor counter respectively (the visitor counter memory note flags `0002` specifically as pending in past sessions — verify current Supabase project state before assuming it's applied).

**Scripts:** `npm run dev` / `build` / `start` / `lint` / `seo:check`.

---

## 11. Notable deliberate constraints

- **Local-first by design.** The PDF editor originally had a full cloud-AI reconstruction path (first Gemini, then Claude); it was built and then *fully removed* at the user's request so the system runs with zero API keys and zero cost. The only remaining network call in the entire tools surface is the opt-in "Rebuild with AI" path (used by the editor and the two Pro-gated PDF tools), which goes through one server route to Claude.
- **`"partial"` tier is a label, not a gate.** Don't assume Free+Pro tools have any actual feature restriction today — check `PremiumGuard` usage (currently only 2 files) before building logic that depends on it.
- **Catalog-driven, not page-driven.** Nav, sitemap, category pages, SEO metadata, and the admin table all derive from `tools-catalog.ts`. Never hardcode a tool list elsewhere — add the catalog entry and everything else follows.
