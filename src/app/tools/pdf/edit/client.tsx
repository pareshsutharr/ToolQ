"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FilePen,
  FilePlus,
  FileText,
  History,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";
import { loadPdfjs } from "@/lib/pdfjs";
import {
  assertValidDocumentModel,
  blockText,
  bumpRevision,
  clearDraft,
  computeStats,
  convertModelToText,
  createEmptyParagraph,
  createEmptyTableBlock,
  createHeadingBlock,
  createImageBlock,
  createSignatureBlock,
  createVersion,
  deleteVersion,
  duplicateVersion,
  ensureInitialVersion,
  exportModelJson,
  exportToDocx,
  exportToHtml,
  exportToPdf,
  exportToTxt,
  getVersion,
  importPdfToModel,
  isEditableText,
  isLowConfidence,
  listVersions,
  loadDraft,
  modelToPlainText,
  renameVersion,
  reconstructDocumentWithClaude,
  runOcrOnScannedPages,
  saveDraft,
  type Block,
  type DocumentModel,
  type DocumentStats,
  type Page,
  type StoredDraft,
  type VersionSummary,
} from "@/lib/doc-model";
import {
  ImageBlockEditor,
  ReadOnlyBlock,
  SignatureBlockView,
  SignaturePad,
  TableBlockEditor,
} from "./blocks";
import { DiffView, VersionsPanel } from "./VersionsPanel";

type Phase = "idle" | "importing" | "editing";
type SaveStatus = "idle" | "saving" | "saved" | "error";
type ExportKind = "txt" | "html" | "pdf" | "docx" | "json";

/** One occurrence of the search term: which block, and the char range within it. */
interface FindMatch {
  sectionId: string;
  start: number;
  end: number;
}

const EXPORTS: { kind: ExportKind; title: string; hint: string }[] = [
  { kind: "pdf", title: "PDF", hint: "Edited PDF document" },
  { kind: "docx", title: "Word (DOCX)", hint: "Editable Word document" },
  { kind: "txt", title: "Plain text", hint: "Just the text" },
  { kind: "html", title: "HTML", hint: "Web page" },
  { kind: "json", title: "Document JSON", hint: "Editable data model" },
];
type AddKind = "text" | "heading" | "table" | "image" | "signature";
type ViewMode = "source" | "rebuild" | "text";

const ADD_MENU: { kind: AddKind; label: string }[] = [
  { kind: "text", label: "Text" },
  { kind: "heading", label: "Heading" },
  { kind: "table", label: "Table" },
  { kind: "image", label: "Image" },
  { kind: "signature", label: "Signature" },
];

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function markBlockEdited(block: Block) {
  block.metadata.updatedAt = new Date().toISOString();
}

// A single editable block. Text is written into the DOM imperatively on mount
// (and re-read via the `key` when it changes externally, e.g. find-and-replace)
// so React never re-renders the contentEditable while the user types — that is
// what keeps the caret from jumping. The document model in the parent ref is
// the single source of truth; this component only reports edits upward.
function EditableBlock({
  block,
  onEdit,
  layout = false,
  rebuild = false,
  showLayoutText = false,
}: {
  block: Block;
  onEdit: (text: string) => void;
  layout?: boolean;
  rebuild?: boolean;
  showLayoutText?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [locallyEdited, setLocallyEdited] = useState(false);
  useEffect(() => {
    if (ref.current) ref.current.textContent = blockText(block);
    // Mount-only: the parent forces a fresh mount via `key` when needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const heading = block.type === "heading";
  const fontSize = block.styles.fontSize;
  const style: CSSProperties = {
    fontFamily: block.styles.fontFamily,
    fontSize: fontSize ? `${Math.min(36, Math.max(8, fontSize))}px` : undefined,
    fontWeight: block.styles.fontWeight,
    color: layout ? undefined : block.styles.color,
    textAlign: block.styles.alignment,
    lineHeight: layout ? 1.18 : undefined,
    caretColor: layout ? "#4F46E5" : undefined,
    paddingTop: layout && !rebuild ? 2 : undefined,
  };
  return (
    <div
      ref={ref}
      data-section-id={block.sectionId}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      spellCheck
      onInput={(e) => {
        setLocallyEdited(true);
        onEdit(e.currentTarget.innerText);
      }}
      className={clsx(
        "min-h-[1.2em] whitespace-pre-wrap break-words rounded outline-none focus:bg-node-blue/5",
        layout
          ? clsx(
              "h-full w-full overflow-hidden px-0.5 py-0 leading-tight transition focus:bg-white/95 focus:text-ink group-hover:bg-white/80 group-hover:text-ink/75",
              showLayoutText || locallyEdited
                ? rebuild
                  ? "bg-transparent text-ink"
                  : "bg-white text-ink"
                : "text-transparent",
            )
          : "-mx-1 px-1",
        heading ? "font-semibold text-deep-ink" : "text-ink",
      )}
      style={style}
    />
  );
}

export default function EditPdfPage() {
  const modelRef = useRef<DocumentModel | null>(null);
  // The originally uploaded PDF, kept for the session so scanned pages can be
  // re-rendered for on-demand OCR. Restored drafts have no source file.
  const sourceFileRef = useRef<File | null>(null);
  const autoOcrStartedRef = useRef<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingPageIdRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [scannedPages, setScannedPages] = useState<number[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [remountKey, setRemountKey] = useState(0);
  const [restorable, setRestorable] = useState<StoredDraft | null>(null);
  const [docName, setDocName] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("source");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const [signaturePageId, setSignaturePageId] = useState<string | null>(null);

  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [versionBusy, setVersionBusy] = useState(false);
  const [diff, setDiff] = useState<{ title: string; oldText: string; newText: string } | null>(
    null,
  );

  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [regexError, setRegexError] = useState(false);
  const [matches, setMatches] = useState<FindMatch[]>([]);
  const [currentMatch, setCurrentMatch] = useState(-1);
  const findInputRef = useRef<HTMLInputElement>(null);
  // Whether the user has navigated yet this search, so the first Next/Prev
  // highlights the current match instead of skipping past it.
  const findNavigatedRef = useRef(false);

  // Recompute matches whenever the query or its options change while Find is open.
  useEffect(() => {
    if (!showFind) return;
    runFind();
    // runFind reads the query/option state captured by this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findText, caseSensitive, wholeWord, useRegex, showFind]);

  // Ctrl/Cmd+F opens Find (overriding the browser's own find) while editing.
  useEffect(() => {
    if (phase !== "editing") return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        openFind();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  // Offer to restore the last autosaved draft on first load (Step 14).
  useEffect(() => {
    loadDraft().then((draft) => {
      if (draft) setRestorable(draft);
    });
  }, []);

  useEffect(
    () => () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (statsTimer.current) clearTimeout(statsTimer.current);
    },
    [],
  );

  useEffect(() => {
    const model = modelRef.current;
    const file = sourceFileRef.current;
    if (!model || !file || phase !== "editing" || scannedPages.length === 0 || ocrBusy) return;
    const runKey = `${model.documentId}:${scannedPages.join(",")}`;
    if (autoOcrStartedRef.current === runKey) return;
    autoOcrStartedRef.current = runKey;
    void runOcr(true);
    // runOcr intentionally remains outside the dependency list; it reads the
    // current model/file refs and this effect is only a scanner trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, scannedPages, ocrBusy]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSaveStatus("saving");
    autosaveTimer.current = setTimeout(async () => {
      const model = modelRef.current;
      if (!model) return;
      try {
        bumpRevision(model);
        assertValidDocumentModel(model);
        await saveDraft(model);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 1200);
  }, []);

  const scheduleStats = useCallback(() => {
    if (statsTimer.current) clearTimeout(statsTimer.current);
    statsTimer.current = setTimeout(() => {
      if (modelRef.current) setStats(computeStats(modelRef.current));
    }, 400);
  }, []);

  const handleBlockEdit = useCallback(
    (block: Block, text: string) => {
      if (block.content.kind === "text" || block.content.kind === "heading") {
        block.content.text = text;
        markBlockEdited(block);
      }
      scheduleAutosave();
      scheduleStats();
    },
    [scheduleAutosave, scheduleStats],
  );

  // Quiet edit from a structured block editor (cell/caption/width): persist and
  // refresh stats without remounting, so the caret in a table cell is kept.
  const onBlockChange = useCallback(() => {
    scheduleAutosave();
    scheduleStats();
  }, [scheduleAutosave, scheduleStats]);

  // Structural change to a page's block list (add/delete/move): remount the
  // blocks so the new arrangement renders.
  function afterStructuralChange() {
    const model = modelRef.current;
    if (!model) return;
    setStats(computeStats(model));
    setRemountKey((k) => k + 1);
    scheduleAutosave();
  }

  function deleteBlock(page: Page, block: Block) {
    const index = page.sections.indexOf(block);
    if (index >= 0) page.sections.splice(index, 1);
    afterStructuralChange();
  }

  function moveBlock(page: Page, block: Block, direction: -1 | 1) {
    const index = page.sections.indexOf(block);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= page.sections.length) return;
    [page.sections[index], page.sections[target]] = [page.sections[target], page.sections[index]];
    afterStructuralChange();
  }

  function moveBlockPosition(block: Block, position: { x: number; y: number }) {
    const model = modelRef.current;
    if (!model) return;
    block.position = position;
    markBlockEdited(block);
    setRemountKey((k) => k + 1);
    scheduleAutosave();
  }

  function addBlock(page: Page, kind: AddKind) {
    if (kind === "image") {
      pendingPageIdRef.current = page.pageId;
      imageInputRef.current?.click();
      return;
    }
    if (kind === "signature") {
      setSignaturePageId(page.pageId);
      return;
    }
    let block: Block | null = null;
    if (kind === "text") block = createEmptyParagraph();
    else if (kind === "heading") block = createHeadingBlock("", 2, 20);
    else if (kind === "table") block = createEmptyTableBlock(2, 2);
    if (block) {
      block.position = { x: page.margins.left, y: page.margins.top };
      block.dimensions = {
        width: Math.max(180, page.size.widthPt - page.margins.left - page.margins.right),
        height: kind === "heading" ? 28 : kind === "table" ? 80 : 24,
      };
      markBlockEdited(block);
      page.sections.push(block);
    }
    afterStructuralChange();
  }

  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const pageId = pendingPageIdRef.current;
    e.target.value = "";
    pendingPageIdRef.current = null;
    if (!file || !pageId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const page = modelRef.current?.pages.find((p) => p.pageId === pageId);
      if (page && typeof reader.result === "string") {
        const block = createImageBlock(reader.result);
        block.position = { x: page.margins.left, y: page.margins.top };
        markBlockEdited(block);
        page.sections.push(block);
        afterStructuralChange();
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSignatureSave(dataUrl: string) {
    const page = modelRef.current?.pages.find((p) => p.pageId === signaturePageId);
    setSignaturePageId(null);
    if (page) {
      const block = createSignatureBlock(dataUrl);
      block.position = { x: page.margins.left, y: page.margins.top };
      markBlockEdited(block);
      page.sections.push(block);
      afterStructuralChange();
    }
  }

  // ---- Version history ----

  const refreshVersions = useCallback(async () => {
    const model = modelRef.current;
    if (!model) return;
    setVersions(await listVersions(model.documentId));
  }, []);

  async function handleSaveVersion(label: string) {
    const model = modelRef.current;
    if (!model || versionBusy) return;
    setVersionBusy(true);
    try {
      await createVersion(model, label);
      await refreshVersions();
    } finally {
      setVersionBusy(false);
    }
  }

  async function handleRestoreVersion(id: string) {
    const record = await getVersion(id);
    const current = modelRef.current;
    if (!record || !current) return;
    // Snapshot current work first so restoring never loses un-versioned edits.
    await createVersion(current, "Before restore");
    const restored = structuredClone(record.model);
    const scanned = restored.pages
      .filter((p) => p.sections.some((s) => s.metadata.source === "ocr" && !blockText(s).trim()))
      .map((p) => p.pageNumber);
    openModel(restored, scanned);
    await saveDraft(restored);
    setSaveStatus("saved");
    await refreshVersions();
  }

  async function handleCompareVersion(id: string) {
    const record = await getVersion(id);
    const current = modelRef.current;
    if (!record || !current) return;
    setDiff({
      title: `Version ${record.versionNumber} vs. current`,
      oldText: modelToPlainText(record.model),
      newText: modelToPlainText(current),
    });
  }

  async function handleDuplicateVersion(id: string) {
    await duplicateVersion(id);
    await refreshVersions();
  }

  async function handleDeleteVersion(id: string) {
    await deleteVersion(id);
    await refreshVersions();
  }

  async function handleRenameVersion(id: string, label: string) {
    await renameVersion(id, label);
    await refreshVersions();
  }

  const openModel = useCallback((model: DocumentModel, scanned: number[]) => {
    modelRef.current = model;
    setDocName(model.name);
    setStats(computeStats(model));
    setScannedPages(scanned);
    setRemountKey((k) => k + 1);
    setRestorable(null);
    setMatches([]);
    setCurrentMatch(-1);
    setPhase("editing");
    autoOcrStartedRef.current = null;
  }, []);

  async function handleFile(files: File[]) {
    const file = files[0];
    if (!file) return;
    sourceFileRef.current = file;
    setError(null);
    setPhase("importing");
    setProgress("Reading document…");
    try {
      const { model, scannedPages: scanned } = await importPdfToModel(file, (p) =>
        setProgress(`Reading page ${p.page} of ${p.total}…`),
      );
      assertValidDocumentModel(model);
      openModel(model, scanned);
      await saveDraft(model);
      setSaveStatus("saved");
      await ensureInitialVersion(model);
      await refreshVersions();
    } catch {
      setError("Couldn't open this file — make sure it's a valid, unlocked PDF.");
      setPhase("idle");
    } finally {
      setProgress(null);
    }
  }

  function restoreDraft() {
    if (!restorable) return;
    // A restored draft has no original file, so OCR is unavailable until the
    // user re-opens the source PDF.
    sourceFileRef.current = null;
    const scanned = restorable.model.pages
      .filter((p) => p.sections.some((s) => s.metadata.source === "ocr" && !blockText(s).trim()))
      .map((p) => p.pageNumber);
    openModel(restorable.model, scanned);
    setSaveStatus("saved");
    void refreshVersions();
  }

  async function dismissDraft() {
    await clearDraft();
    setRestorable(null);
  }

  function handleRename(name: string) {
    setDocName(name);
    if (modelRef.current) {
      modelRef.current.name = name;
      scheduleAutosave();
    }
  }

  function buildRegex(): RegExp | null {
    if (!findText) return null;
    let pattern = useRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (wholeWord && !useRegex) pattern = `\\b${pattern}\\b`;
    try {
      const re = new RegExp(pattern, caseSensitive ? "g" : "gi");
      setRegexError(false);
      return re;
    } catch {
      setRegexError(useRegex);
      return null;
    }
  }

  // Every match across all pages, in document order, as {block, char range}.
  function computeMatches(): FindMatch[] {
    const model = modelRef.current;
    const re = buildRegex();
    if (!model || !re) return [];
    const out: FindMatch[] = [];
    for (const page of model.pages) {
      for (const block of page.sections) {
        if (!isEditableText(block)) continue;
        const text = blockText(block);
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          out.push({ sectionId: block.sectionId, start: m.index, end: m.index + m[0].length });
          if (m[0].length === 0) re.lastIndex += 1; // guard against zero-width matches
        }
      }
    }
    return out;
  }

  function runFind() {
    const list = computeMatches();
    findNavigatedRef.current = false;
    setMatches(list);
    setCurrentMatch(list.length ? 0 : -1);
  }

  // Map a character offset within a block to a DOM (textNode, offset), walking
  // text nodes so blocks the user split with Enter still resolve correctly.
  function locateOffset(root: Node, offset: number): { node: Node; offset: number } | null {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = offset;
    let last: Node | null = null;
    let node = walker.nextNode();
    while (node) {
      const len = node.textContent?.length ?? 0;
      if (remaining <= len) return { node, offset: remaining };
      remaining -= len;
      last = node;
      node = walker.nextNode();
    }
    return last ? { node: last, offset: last.textContent?.length ?? 0 } : null;
  }

  // Scroll the match into view and select it with the native Selection API.
  function highlightMatch(match: FindMatch, canSwitchView = true) {
    const el = document.querySelector<HTMLElement>(`[data-section-id="${match.sectionId}"]`);
    if (!el) {
      // Block isn't in the current view — the linear "text" view renders every
      // block, so switch to it and retry once.
      if (canSwitchView) {
        setViewMode("text");
        setTimeout(() => highlightMatch(match, false), 80);
      }
      return;
    }
    const from = locateOffset(el, match.start);
    const to = locateOffset(el, match.end);
    if (from && to) {
      try {
        const range = document.createRange();
        range.setStart(from.node, from.offset);
        range.setEnd(to.node, to.offset);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {
        // Ignore transient range errors (e.g. mid-remount).
      }
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function goToMatch(index: number, list: FindMatch[] = matches) {
    if (list.length === 0) return;
    const wrapped = ((index % list.length) + list.length) % list.length;
    findNavigatedRef.current = true;
    setCurrentMatch(wrapped);
    requestAnimationFrame(() => highlightMatch(list[wrapped]));
  }

  function findNext() {
    if (matches.length === 0) return;
    goToMatch(findNavigatedRef.current ? currentMatch + 1 : currentMatch);
  }

  function findPrev() {
    if (matches.length === 0) return;
    goToMatch(findNavigatedRef.current ? currentMatch - 1 : currentMatch);
  }

  function findBlockById(id: string): Block | undefined {
    const model = modelRef.current;
    if (!model) return undefined;
    for (const page of model.pages) {
      const block = page.sections.find((s) => s.sectionId === id);
      if (block) return block;
    }
    return undefined;
  }

  function replaceCurrent() {
    const model = modelRef.current;
    if (!model || currentMatch < 0 || currentMatch >= matches.length) return;
    const match = matches[currentMatch];
    const block = findBlockById(match.sectionId);
    if (!block || (block.content.kind !== "text" && block.content.kind !== "heading")) return;
    const text = block.content.text;
    block.content.text = text.slice(0, match.start) + replaceText + text.slice(match.end);
    markBlockEdited(block);
    setRemountKey((k) => k + 1);
    setStats(computeStats(model));
    scheduleAutosave();
    // Recompute and step to the next match near the same spot.
    const list = computeMatches();
    setMatches(list);
    if (list.length === 0) {
      setCurrentMatch(-1);
      return;
    }
    const nextIdx = Math.min(currentMatch, list.length - 1);
    findNavigatedRef.current = true;
    setCurrentMatch(nextIdx);
    requestAnimationFrame(() => highlightMatch(list[nextIdx]));
  }

  function replaceAll() {
    const model = modelRef.current;
    const re = buildRegex();
    if (!model || !re) return;
    for (const page of model.pages) {
      for (const block of page.sections) {
        if (block.content.kind === "text" || block.content.kind === "heading") {
          const next = block.content.text.replace(re, replaceText);
          if (next !== block.content.text) {
            block.content.text = next;
            markBlockEdited(block);
          }
        }
      }
    }
    setRemountKey((k) => k + 1);
    setStats(computeStats(model));
    scheduleAutosave();
    runFind();
  }

  function openFind() {
    setShowFind(true);
    setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 0);
  }

  function closeFind() {
    setShowFind(false);
    window.getSelection()?.removeAllRanges();
  }

  async function doExport(kind: ExportKind) {
    const model = modelRef.current;
    if (!model) return;
    const base = (model.name || "document").replace(/\.[^.]+$/, "") || "document";
    try {
      if (kind === "txt") download(exportToTxt(model), `${base}.txt`);
      else if (kind === "html") download(exportToHtml(model), `${base}.html`);
      else if (kind === "json") download(exportModelJson(model), `${base}.json`);
      else if (kind === "docx") download(await exportToDocx(model), `${base}.docx`);
      else if (kind === "pdf") {
        const pdf = await exportToPdf(model, { rebuild: viewMode === "rebuild" });
        download(pdf, `${base}-edited.pdf`);
      }
    } catch {
      setError("Export failed — your edits are still safe. Try another format.");
    }
  }

  async function runOcr(automatic = false) {
    const model = modelRef.current;
    const file = sourceFileRef.current;
    if (!model || !file || scannedPages.length === 0 || ocrBusy) return;
    setOcrBusy(true);
    setError(null);
    setOcrProgress(automatic ? "Auto OCR is starting…" : "Loading OCR engine…");
    try {
      const pdfjsLib = await loadPdfjs();
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const { failedPages } = await runOcrOnScannedPages({
        pdf,
        model,
        scannedPageNumbers: scannedPages,
        onProgress: (p) =>
          setOcrProgress(
            `${p.phase === "rendering" ? "Rendering" : "Reading"} page ${p.page} of ${p.total}…`,
          ),
      });
      setScannedPages(failedPages);
      setRemountKey((k) => k + 1);
      setStats(computeStats(model));
      scheduleAutosave();
      if (failedPages.length > 0) {
        setError(
          `OCR couldn't extract text from ${failedPages.length} page(s) — those pages remain visually editable with manual text blocks.`,
        );
      }
    } catch {
      setError(
        automatic
          ? "Auto OCR failed — your document is unchanged. You can retry OCR or type manually."
          : "OCR failed — your document is unchanged. You can still type the text manually.",
      );
    } finally {
      setOcrBusy(false);
      setOcrProgress(null);
    }
  }

  async function runAiRebuild() {
    const model = modelRef.current;
    if (!model || aiBusy || ocrBusy) return;
    if (!model.pages.every((page) => Boolean(page.backgroundDataUrl))) {
      setError("AI rebuild needs the original rendered page images. Re-open the source PDF and try again.");
      return;
    }
    const consent = window.confirm(
      "Rebuild with AI sends an image of each page to Anthropic Claude to reconstruct editable text, tables, and graphics. The page images leave your browser for this step. Continue?",
    );
    if (!consent) return;

    setAiBusy(true);
    setError(null);
    setAiProgress("Preparing pages for Claude…");
    try {
      try {
        await createVersion(model, "Before AI rebuild");
      } catch {
        // Versioning is best-effort; reconstruction still remains atomic.
      }
      await reconstructDocumentWithClaude(model, (p) => {
        setAiProgress(
          p.phase === "sending"
            ? `Claude is reading page ${p.page} of ${p.total}…`
            : `Rebuilding page ${p.page} of ${p.total}…`,
        );
      });
      setScannedPages([]);
      setViewMode("rebuild");
      setRemountKey((key) => key + 1);
      setStats(computeStats(model));
      scheduleAutosave();
      void refreshVersions();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI rebuild failed — your document is unchanged.");
    } finally {
      setAiBusy(false);
      setAiProgress(null);
    }
  }

  // "Text only" — flatten the document to clean, reflowed, editable text
  // (drops images/layout, joins wrapped lines into flowing paragraphs). Snapshot
  // first so it's fully undoable from Versions.
  async function convertToTextOnly() {
    const model = modelRef.current;
    if (!model || ocrBusy) return;
    setError(null);
    try {
      await createVersion(model, "Before text conversion");
    } catch {
      // Versioning is best-effort; never block the conversion on it.
    }
    convertModelToText(model);
    setScannedPages([]);
    setViewMode("text");
    setRemountKey((k) => k + 1);
    setStats(computeStats(model));
    scheduleAutosave();
    void refreshVersions();
  }

  function newDocument() {
    sourceFileRef.current = null;
    setPhase("idle");
    setError(null);
    setShowFind(false);
  }

  // ---- Rendering ----

  if (phase !== "editing") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-node-blue/10 text-node-blue">
            <FilePen className="h-7 w-7" />
          </span>
          <h1 className="font-display text-3xl font-bold text-deep-ink sm:text-4xl">Edit PDF</h1>
          <p className="mt-3 max-w-md text-ink/60">
            Open a PDF as an editable document — change the text, tables and images, then export to
            PDF, Word, or plain text.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {restorable && phase !== "importing" && (
            <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <RotateCcw className="h-5 w-5 shrink-0 text-node-blue" />
                <p className="text-sm text-ink/70">
                  Restore your last document{" "}
                  <span className="font-medium text-deep-ink">“{restorable.name || "Untitled"}”</span>?
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={restoreDraft} className="btn-primary px-4 py-2 text-sm">
                  Restore
                </button>
                <button onClick={dismissDraft} className="btn-secondary px-4 py-2 text-sm">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {phase === "importing" ? (
            <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-node-blue" />
              <div>
                <p className="font-display text-lg font-semibold text-deep-ink">
                  Processing your PDF…
                </p>
                <p className="mt-1 text-sm text-ink/55">{progress || "Reading the document…"}</p>
              </div>
              <div className="h-1 w-40 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-node-blue" />
              </div>
            </div>
          ) : (
            <Dropzone
              variant="hero"
              accept="application/pdf"
              onFiles={handleFile}
              cta="Select PDF file"
              label="or drop your PDF here"
            />
          )}

          {error && <p className="text-center text-sm text-flag-red">{error}</p>}

          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink/45">
            <span>Text &amp; scanned PDFs</span>
            <span aria-hidden>·</span>
            <span>Export to Word, PDF &amp; text</span>
            <span aria-hidden>·</span>
            <span>Private local editing by default</span>
          </div>
        </div>
      </div>
    );
  }

  const model = modelRef.current!;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Toolbar */}
      <div className="card sticky top-2 z-10 flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-ink/30" />
            <input
              aria-label="Document name"
              value={docName}
              onChange={(e) => handleRename(e.target.value)}
              className="min-w-0 max-w-xs flex-1 rounded border border-ink/10 px-2 py-1 text-sm font-medium text-deep-ink focus:border-node-blue focus:outline-none"
            />
            <SavePill status={saveStatus} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex rounded-lg border border-ink/10 bg-white p-0.5"
              aria-label="View mode"
            >
              {(["source", "rebuild", "text"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={clsx(
                    "rounded-md px-3 py-1 text-xs font-semibold capitalize transition",
                    viewMode === mode
                      ? "bg-node-blue text-white"
                      : "text-ink/55 hover:bg-ink/5 hover:text-ink",
                  )}
                  aria-pressed={viewMode === mode}
                >
                  {mode}
                </button>
              ))}
            </div>
            <ToolbarButton
              onClick={runAiRebuild}
              disabled={aiBusy || ocrBusy}
              primary
              icon={
                aiBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )
              }
              label={aiBusy ? "Rebuilding…" : "Rebuild with AI"}
              title="Use Anthropic Claude to reconstruct editable text, tables, and graphics"
            />
            <span className="hidden h-6 w-px bg-ink/10 sm:block" aria-hidden />
            <ToolbarButton
              onClick={convertToTextOnly}
              disabled={ocrBusy}
              primary
              icon={<Type className="h-3.5 w-3.5" />}
              label="Text only"
              title="Convert to clean editable text — reflows paragraphs, flattens tables, and removes images"
            />
            <ToolbarButton
              onClick={() => (showFind ? closeFind() : openFind())}
              icon={<Search className="h-3.5 w-3.5" />}
              label="Find"
              expanded={showFind}
            />
            <ToolbarButton
              onClick={() => setShowVersions((v) => !v)}
              icon={<History className="h-3.5 w-3.5" />}
              label="Versions"
              expanded={showVersions}
              badge={versions.length || undefined}
            />
            <span className="hidden h-6 w-px bg-ink/10 sm:block" aria-hidden />
            <ToolbarMenu label="Download" icon={<Download className="h-3.5 w-3.5" />} primary>
              {(close) =>
                EXPORTS.map((x) => (
                  <MenuItem
                    key={x.kind}
                    title={x.title}
                    hint={x.hint}
                    onClick={() => {
                      void doExport(x.kind);
                      close();
                    }}
                  />
                ))
              }
            </ToolbarMenu>
            <ToolbarButton
              onClick={newDocument}
              icon={<FilePlus className="h-3.5 w-3.5" />}
              label="New"
            />
          </div>
        </div>

        {stats && (
          <p className="text-xs text-ink/50">
            {stats.pageCount} {stats.pageCount === 1 ? "page" : "pages"} · {stats.wordCount} words ·{" "}
            {stats.charCount} characters
            {stats.lowConfidenceBlocks > 0 && (
              <span className="text-amber">
                {" "}
                · {stats.lowConfidenceBlocks} block(s) need review
              </span>
            )}
          </p>
        )}

        {showFind && (
          <div className="flex flex-col gap-2 border-t border-ink/10 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Find field + match counter + prev/next */}
              <div className="flex flex-1 items-center gap-1 rounded-lg border border-ink/10 bg-white px-1 focus-within:border-node-blue">
                <input
                  ref={findInputRef}
                  aria-label="Find"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (e.shiftKey) findPrev();
                      else findNext();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      closeFind();
                    }
                  }}
                  placeholder="Find"
                  className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm outline-none"
                />
                <span
                  className={clsx(
                    "whitespace-nowrap px-1 text-[11px] tabular-nums",
                    regexError ? "text-flag-red" : "text-ink/45",
                  )}
                >
                  {regexError
                    ? "Bad pattern"
                    : matches.length === 0
                      ? findText
                        ? "No results"
                        : ""
                      : `${currentMatch + 1} of ${matches.length}`}
                </span>
                <button
                  onClick={findPrev}
                  disabled={matches.length === 0}
                  title="Previous match (Shift+Enter)"
                  aria-label="Previous match"
                  className="rounded p-1 text-ink/50 transition hover:bg-ink/5 hover:text-ink disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={findNext}
                  disabled={matches.length === 0}
                  title="Next match (Enter)"
                  aria-label="Next match"
                  className="rounded p-1 text-ink/50 transition hover:bg-ink/5 hover:text-ink disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={closeFind}
                title="Close (Esc)"
                aria-label="Close find"
                className="rounded-lg border border-ink/10 p-1.5 text-ink/50 transition hover:border-node-blue/40 hover:text-node-blue"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Replace with"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    replaceCurrent();
                  }
                }}
                placeholder="Replace with"
                className="min-w-0 flex-1 rounded-lg border border-ink/10 px-2 py-1 text-sm focus:border-node-blue focus:outline-none"
              />
              <button
                onClick={replaceCurrent}
                disabled={currentMatch < 0}
                className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Replace
              </button>
              <button
                onClick={replaceAll}
                disabled={matches.length === 0}
                className="btn-primary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Replace all
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <FindToggle
                active={caseSensitive}
                onClick={() => setCaseSensitive((v) => !v)}
                label="Aa"
                title="Match case"
              />
              <FindToggle
                active={wholeWord}
                onClick={() => setWholeWord((v) => !v)}
                label="ab|"
                title="Whole word"
                disabled={useRegex}
              />
              <FindToggle
                active={useRegex}
                onClick={() => setUseRegex((v) => !v)}
                label=".*"
                title="Regular expression"
              />
            </div>
          </div>
        )}

        {showVersions && (
          <VersionsPanel
            versions={versions}
            busy={versionBusy}
            onSaveVersion={handleSaveVersion}
            onRestore={handleRestoreVersion}
            onCompare={handleCompareVersion}
            onDuplicate={handleDuplicateVersion}
            onDelete={handleDeleteVersion}
            onRename={handleRenameVersion}
          />
        )}
      </div>

      {scannedPages.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber/30 bg-amber/5 px-4 py-3 text-sm text-amber sm:flex-row sm:items-center sm:justify-between">
          <div>
            {scannedPages.length} page{scannedPages.length === 1 ? "" : "s"} look scanned (no text
            layer).{" "}
            {sourceFileRef.current
              ? ocrBusy
                ? "Extracting editable text automatically."
                : "OCR will run automatically; retry if extraction missed anything."
              : "Re-open the original PDF to run OCR, or type the text in directly."}
            {ocrProgress && <span className="mt-1 block text-amber/80">{ocrProgress}</span>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={runAiRebuild}
              disabled={aiBusy || ocrBusy}
              className="btn-primary gap-1.5 px-3 py-1.5 text-xs"
            >
              {aiBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {aiBusy ? "Rebuilding…" : "Rebuild with AI"}
            </button>
            {sourceFileRef.current && (
              <button
                onClick={() => runOcr(false)}
                disabled={ocrBusy || aiBusy}
                className="btn-secondary gap-1.5 px-3 py-1.5 text-xs"
              >
                {ocrBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {ocrBusy ? "Extracting…" : "Retry OCR"}
              </button>
            )}
          </div>
        </div>
      )}

      {aiProgress && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-node-blue/20 bg-node-blue/5 px-4 py-3 text-sm text-node-blue">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>{aiProgress}</span>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-flag-red">{error}</p>}

      {/* Hidden inputs / overlays for inserting media */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleImageSelected}
      />
      {signaturePageId && (
        <SignaturePad onSave={handleSignatureSave} onCancel={() => setSignaturePageId(null)} />
      )}
      {diff && (
        <DiffView
          title={diff.title}
          oldText={diff.oldText}
          newText={diff.newText}
          onClose={() => setDiff(null)}
        />
      )}

      {/* Pages */}
      <div className="mt-6 flex flex-col gap-6">
        {model.pages.map((page) => (
          <PageEditor
            key={page.pageId}
            page={page}
            remountKey={remountKey}
            viewMode={viewMode}
            onEditBlock={(block, text) => handleBlockEdit(block, text)}
            onChangeBlock={onBlockChange}
            onDeleteBlock={(block) => deleteBlock(page, block)}
            onMoveBlock={(block, direction) => moveBlock(page, block, direction)}
            onMoveBlockPosition={moveBlockPosition}
            onAddBlock={(kind) => addBlock(page, kind)}
          />
        ))}
      </div>
    </div>
  );
}

function PageEditor({
  page,
  remountKey,
  viewMode,
  onEditBlock,
  onChangeBlock,
  onDeleteBlock,
  onMoveBlock,
  onMoveBlockPosition,
  onAddBlock,
}: {
  page: Page;
  remountKey: number;
  viewMode: ViewMode;
  onEditBlock: (block: Block, text: string) => void;
  onChangeBlock: () => void;
  onDeleteBlock: (block: Block) => void;
  onMoveBlock: (block: Block, direction: -1 | 1) => void;
  onMoveBlockPosition: (block: Block, position: { x: number; y: number }) => void;
  onAddBlock: (kind: AddKind) => void;
}) {
  return (
    <article className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink/35">
          Page {page.pageNumber}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="self-center text-[11px] uppercase tracking-wide text-ink/30">Add</span>
          {ADD_MENU.map(({ kind, label }) => (
            <button
              key={kind}
              onClick={() => onAddBlock(kind)}
              className="btn-secondary px-2 py-1 text-xs"
            >
              + {label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "source" ? (
        <LayoutPage
          page={page}
          remountKey={remountKey}
          onEditBlock={onEditBlock}
          onChangeBlock={onChangeBlock}
          onDeleteBlock={onDeleteBlock}
          onMoveBlock={onMoveBlock}
          onMoveBlockPosition={onMoveBlockPosition}
        />
      ) : viewMode === "rebuild" ? (
        <RebuildPage
          page={page}
          remountKey={remountKey}
          onEditBlock={onEditBlock}
          onChangeBlock={onChangeBlock}
          onDeleteBlock={onDeleteBlock}
          onMoveBlock={onMoveBlock}
        />
      ) : (
        <TextPage
          page={page}
          remountKey={remountKey}
          onEditBlock={onEditBlock}
          onChangeBlock={onChangeBlock}
          onDeleteBlock={onDeleteBlock}
          onMoveBlock={onMoveBlock}
        />
      )}
    </article>
  );
}

function LayoutPage({
  page,
  remountKey,
  onEditBlock,
  onChangeBlock,
  onDeleteBlock,
  onMoveBlock,
  onMoveBlockPosition,
}: {
  page: Page;
  remountKey: number;
  onEditBlock: (block: Block, text: string) => void;
  onChangeBlock: () => void;
  onDeleteBlock: (block: Block) => void;
  onMoveBlock: (block: Block, direction: -1 | 1) => void;
  onMoveBlockPosition: (block: Block, position: { x: number; y: number }) => void;
}) {
  return (
    <div className="overflow-x-auto bg-surface px-4 py-6">
      <div
        data-page-surface="true"
        data-page-width={page.size.widthPt}
        data-page-height={page.size.heightPt}
        className="relative mx-auto overflow-hidden bg-white shadow-sm ring-1 ring-ink/10"
        style={{ width: page.size.widthPt, height: page.size.heightPt }}
      >
        {page.backgroundDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.backgroundDataUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-fill"
          />
        )}

        {page.sections.length === 0 && !page.backgroundDataUrl && (
          <p className="absolute left-6 top-6 text-sm italic text-ink/40">
            This page has no content yet.
          </p>
        )}

        {page.sections
          .filter(shouldRenderBlockOnSourcePage)
          .map((block) => (
            <div
              key={`${block.sectionId}-${remountKey}`}
              className="absolute"
              style={layoutBlockStyle(block, page)}
            >
              <BlockRow
                block={block}
                layout
                showLayoutText={Boolean(block.metadata.updatedAt)}
                onEditText={(text) => onEditBlock(block, text)}
                onChange={onChangeBlock}
                onDelete={() => onDeleteBlock(block)}
                onMoveUp={() => onMoveBlock(block, -1)}
                onMoveDown={() => onMoveBlock(block, 1)}
                onMovePosition={(position) => onMoveBlockPosition(block, position)}
              />
            </div>
          ))}
      </div>
    </div>
  );
}

function shouldRenderBlockOnSourcePage(block: Block): boolean {
  // Source mode is the original PDF surface. Unedited OCR/extracted blocks are
  // data, not visible UI; showing them creates the ugly overlap the user saw.
  // Once edited/added, a block becomes a visible whiteout replacement patch.
  return Boolean(block.metadata.updatedAt);
}

function readingOrderBlocks(page: Page): Block[] {
  return [...page.sections]
    .filter((block) => {
      if (block.content.kind === "image" && !block.metadata.updatedAt) {
        return block.dimensions.width > 16 && block.dimensions.height > 16;
      }
      return Boolean(blockText(block).trim()) || block.metadata.updatedAt;
    })
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
}

function rebuildIndent(block: Block, page: Page): number {
  const base = Math.max(0, block.position.x - page.margins.left);
  if (block.content.kind === "image" || block.content.kind === "signature") return 0;
  if (/^[•o]\s/.test(blockText(block).trim())) return Math.min(48, Math.max(18, base * 0.35));
  return Math.min(36, base * 0.18);
}

function RebuildPage({
  page,
  remountKey,
  onEditBlock,
  onChangeBlock,
  onDeleteBlock,
  onMoveBlock,
}: {
  page: Page;
  remountKey: number;
  onEditBlock: (block: Block, text: string) => void;
  onChangeBlock: () => void;
  onDeleteBlock: (block: Block) => void;
  onMoveBlock: (block: Block, direction: -1 | 1) => void;
}) {
  const blocks = readingOrderBlocks(page);
  return (
    <div className="bg-surface px-4 py-6">
      <div
        className="mx-auto min-h-[720px] max-w-[760px] bg-white px-12 py-14 shadow-sm ring-1 ring-ink/10"
        style={{ aspectRatio: `${page.size.widthPt} / ${page.size.heightPt}` }}
      >
        {blocks.length === 0 && (
          <p className="text-sm italic text-ink/40">OCR is preparing this page…</p>
        )}
        <div className="space-y-3">
          {blocks.map((block) => (
            <div
              key={`${block.sectionId}-${remountKey}`}
              style={{ marginLeft: rebuildIndent(block, page) }}
            >
              <RebuildBlock
                block={block}
                onEditText={(text) => onEditBlock(block, text)}
                onChange={onChangeBlock}
                onDelete={() => onDeleteBlock(block)}
                onMoveUp={() => onMoveBlock(block, -1)}
                onMoveDown={() => onMoveBlock(block, 1)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RebuildBlock({
  block,
  onEditText,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: Block;
  onEditText: (text: string) => void;
  onChange: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isHeading = block.type === "heading";
  const isBullet = /^[•o]\s/.test(blockText(block).trim());
  return (
    <div
      className={clsx(
        "group relative rounded-sm",
        isHeading && "mt-5 border-b border-ink/15 pb-1",
        isBullet && "pl-2",
        isLowConfidence(block) && "border-l-2 border-amber pl-3",
      )}
    >
      <div className="absolute -right-2 -top-2 z-10 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
        <BlockControl label="Move up" onClick={onMoveUp}>
          ↑
        </BlockControl>
        <BlockControl label="Move down" onClick={onMoveDown}>
          ↓
        </BlockControl>
        <BlockControl label="Delete block" onClick={onDelete} danger>
          ✕
        </BlockControl>
      </div>

      {isLowConfidence(block) && (
        <p className="mb-1 text-[11px] font-medium text-amber">Needs review</p>
      )}

      <div
        className={clsx(
          "leading-relaxed text-ink",
          isHeading ? "text-base font-bold" : "text-sm",
          isBullet && "rebuild-bullet",
        )}
      >
        <BlockBody
          block={block}
          onEditText={onEditText}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function TextPage({
  page,
  remountKey,
  onEditBlock,
  onChangeBlock,
  onDeleteBlock,
  onMoveBlock,
}: {
  page: Page;
  remountKey: number;
  onEditBlock: (block: Block, text: string) => void;
  onChangeBlock: () => void;
  onDeleteBlock: (block: Block) => void;
  onMoveBlock: (block: Block, direction: -1 | 1) => void;
}) {
  return (
    <div className="px-6 py-8 sm:px-10 sm:py-12">
      <div className="flex flex-col gap-2">
        {page.sections.length === 0 && (
          <p className="text-sm italic text-ink/40">This page has no content yet.</p>
        )}
        {page.sections.map((block) => (
          <BlockRow
            key={`${block.sectionId}-${remountKey}`}
            block={block}
            onEditText={(text) => onEditBlock(block, text)}
            onChange={onChangeBlock}
            onDelete={() => onDeleteBlock(block)}
            onMoveUp={() => onMoveBlock(block, -1)}
            onMoveDown={() => onMoveBlock(block, 1)}
          />
        ))}
      </div>
    </div>
  );
}

function layoutBlockStyle(block: Block, page: Page): CSSProperties {
  const left = Math.max(0, Math.min(page.size.widthPt, block.position.x));
  const top = Math.max(0, Math.min(page.size.heightPt, block.position.y));
  const width =
    block.dimensions.width > 0
      ? Math.min(block.dimensions.width, page.size.widthPt - left)
      : Math.max(80, page.size.widthPt - left - page.margins.right);
  const height =
    block.dimensions.height > 0
      ? Math.min(block.dimensions.height + 8, page.size.heightPt - top)
      : undefined;
  return { left, top: Math.max(0, top - 2), width, height };
}

function BlockRow({
  block,
  layout = false,
  rebuild = false,
  showLayoutText = false,
  onEditText,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMovePosition,
}: {
  block: Block;
  layout?: boolean;
  rebuild?: boolean;
  showLayoutText?: boolean;
  onEditText: (text: string) => void;
  onChange: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMovePosition?: (position: { x: number; y: number }) => void;
}) {
  const lowConf = isLowConfidence(block);
  const scannedEmpty = block.metadata.source === "ocr" && !blockText(block).trim();

  function startDrag(e: React.PointerEvent<HTMLButtonElement>) {
    if (!onMovePosition) return;
    const movePosition = onMovePosition;
    e.preventDefault();
    e.stopPropagation();
    const pageEl = e.currentTarget.closest("[data-page-surface]") as HTMLElement | null;
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const pageWidth = Number(pageEl.dataset.pageWidth) || rect.width;
    const pageHeight = Number(pageEl.dataset.pageHeight) || rect.height;
    const sx = pageWidth / rect.width;
    const sy = pageHeight / rect.height;
    const startX = e.clientX;
    const startY = e.clientY;
    const initial = { ...block.position };
    const maxX = Math.max(0, pageWidth - Math.max(24, block.dimensions.width));
    const maxY = Math.max(0, pageHeight - Math.max(16, block.dimensions.height));

    function onMove(ev: PointerEvent) {
      movePosition({
        x: Math.max(0, Math.min(maxX, initial.x + (ev.clientX - startX) * sx)),
        y: Math.max(0, Math.min(maxY, initial.y + (ev.clientY - startY) * sy)),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  return (
    <div
      className={clsx(
        "group relative",
        layout
          ? "h-full w-full rounded-sm ring-node-blue/0 transition hover:ring-1 hover:ring-node-blue/40 focus-within:ring-2 focus-within:ring-node-blue"
          : "py-0.5",
        (lowConf || scannedEmpty) &&
          (layout
            ? rebuild && "ring-1 ring-amber/55 hover:ring-amber focus-within:ring-amber"
            : "border-l-2 border-amber pl-3"),
      )}
      title={
        layout && rebuild && (lowConf || scannedEmpty)
          ? scannedEmpty
            ? "Scanned page block"
            : "Low OCR confidence"
          : undefined
      }
    >
      <div className="absolute -right-1 -top-1 z-10 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
        {layout && (
          <button
            onPointerDown={startDrag}
            title="Drag block"
            aria-label="Drag block"
            className="flex h-6 w-6 cursor-move items-center justify-center rounded border border-ink/10 bg-white text-xs text-ink/50 shadow-sm hover:border-node-blue/40"
          >
            ⠿
          </button>
        )}
        <BlockControl label="Move up" onClick={onMoveUp}>
          ↑
        </BlockControl>
        <BlockControl label="Move down" onClick={onMoveDown}>
          ↓
        </BlockControl>
        <BlockControl label="Delete block" onClick={onDelete} danger>
          ✕
        </BlockControl>
      </div>

      {(lowConf || scannedEmpty) && !layout && (
        <p
          className="mb-1 text-[11px] font-medium text-amber"
        >
          {scannedEmpty
            ? "Scanned page — type the text you see here."
            : "Low OCR confidence — please check this text."}
        </p>
      )}

      <BlockBody
        block={block}
        layout={layout}
        rebuild={rebuild}
        showLayoutText={showLayoutText}
        onEditText={onEditText}
        onChange={onChange}
      />
    </div>
  );
}

function BlockBody({
  block,
  layout = false,
  rebuild = false,
  showLayoutText = false,
  onEditText,
  onChange,
}: {
  block: Block;
  layout?: boolean;
  rebuild?: boolean;
  showLayoutText?: boolean;
  onEditText: (text: string) => void;
  onChange: () => void;
}) {
  if (isEditableText(block)) {
    return (
      <EditableBlock
        block={block}
        onEdit={onEditText}
        layout={layout}
        rebuild={rebuild}
        showLayoutText={showLayoutText}
      />
    );
  }
  const markAndChange = () => {
    markBlockEdited(block);
    onChange();
  };
  switch (block.content.kind) {
    case "table":
      if (layout && !rebuild && !block.metadata.updatedAt) return null;
      return <TableBlockEditor block={block} onChange={markAndChange} />;
    case "image":
      if (layout && !rebuild && !block.metadata.updatedAt) return null;
      return <ImageBlockEditor block={block} onChange={markAndChange} />;
    case "signature":
      if (layout && !rebuild && !block.metadata.updatedAt) return null;
      return <SignatureBlockView block={block} onChange={markAndChange} />;
    default:
      return <ReadOnlyBlock block={block} />;
  }
}

function BlockControl({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={clsx(
        "flex h-6 w-6 items-center justify-center rounded border border-ink/10 bg-white text-xs shadow-sm hover:border-node-blue/40",
        danger ? "text-flag-red" : "text-ink/50",
      )}
    >
      {children}
    </button>
  );
}

function SavePill({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map: Record<Exclude<SaveStatus, "idle">, { label: string; className: string }> = {
    saving: { label: "Saving…", className: "text-ink/40" },
    saved: { label: "Saved", className: "text-spark-lime" },
    error: { label: "Save failed", className: "text-flag-red" },
  };
  const { label, className } = map[status];
  return <span className={clsx("whitespace-nowrap text-xs font-medium", className)}>{label}</span>;
}

// Compact icon+label toolbar button, primary (filled) or secondary (outlined).
function ToolbarButton({
  onClick,
  icon,
  label,
  primary,
  disabled,
  expanded,
  badge,
  title,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  badge?: number;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-expanded={expanded}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        primary
          ? "bg-node-blue text-white hover:bg-node-blue/90"
          : "border border-ink/10 bg-white text-ink hover:border-node-blue/40 hover:text-node-blue",
      )}
    >
      {icon}
      {label}
      {badge != null && <span className="text-ink/40">({badge})</span>}
    </button>
  );
}

// Toolbar dropdown menu (e.g. Download). Closes on outside click or Escape.
function ToolbarMenu({
  label,
  icon,
  primary,
  children,
}: {
  label: string;
  icon: ReactNode;
  primary?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
          primary
            ? "bg-node-blue text-white hover:bg-node-blue/90"
            : "border border-ink/10 bg-white text-ink hover:border-node-blue/40 hover:text-node-blue",
        )}
      >
        {icon}
        {label}
        <ChevronDown className={clsx("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-ink/10 bg-white py-1 shadow-lg"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, title, hint }: { onClick: () => void; title: string; hint?: string }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full flex-col items-start px-3 py-2 text-left transition hover:bg-node-blue/5"
    >
      <span className="text-sm font-medium text-deep-ink">{title}</span>
      {hint && <span className="text-[11px] text-ink/45">{hint}</span>}
    </button>
  );
}

// Small monospace toggle chip for Find options (case / whole word / regex).
function FindToggle({
  active,
  onClick,
  label,
  title,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={clsx(
        "rounded-md border px-2 py-1 font-mono text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-node-blue bg-node-blue/10 text-node-blue"
          : "border-ink/10 bg-white text-ink/50 hover:border-node-blue/40 hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
