// PowerPoint (.pptx) → plain text per slide. A .pptx is a zip of OOXML parts;
// we deliberately extract text only (via jszip, already a dependency) rather
// than attempting to render slide layouts/shapes/images — there is no mature
// client-side .pptx *renderer*, so a faithful visual conversion isn't feasible
// fully in-browser. This trades visual fidelity for something honest and real.
//
// Slide *file* order (slide1.xml, slide2.xml, …) is creation order, not
// necessarily display order — dragging a slide to reorder it in PowerPoint
// does not rename its part file. The actual display order lives in
// presentation.xml's <p:sldIdLst>, resolved through presentation.xml.rels.
// Skipping that resolution and just sorting by filename would silently
// misorder any deck that's ever had a slide reordered — a very common
// action — so it's resolved properly here instead.

export interface PptxSlideText {
  slideNumber: number;
  paragraphs: string[];
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

export async function extractPptxText(file: File): Promise<PptxSlideText[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);

  const presentationEntry = zip.file("ppt/presentation.xml");
  const relsEntry = zip.file("ppt/_rels/presentation.xml.rels");
  if (!presentationEntry || !relsEntry) {
    throw new Error("Not a valid PowerPoint (.pptx) file.");
  }

  const relsDoc = parseXml(await relsEntry.async("string"));
  const relMap = new Map<string, string>();
  Array.from(relsDoc.getElementsByTagName("Relationship")).forEach((rel) => {
    const id = rel.getAttribute("Id");
    const target = rel.getAttribute("Target");
    if (id && target && target.includes("slides/slide")) relMap.set(id, target);
  });

  const presentationDoc = parseXml(await presentationEntry.async("string"));
  const orderedTargets: string[] = [];
  Array.from(presentationDoc.getElementsByTagName("p:sldId")).forEach((sldId) => {
    const rId = sldId.getAttribute("r:id");
    const target = rId ? relMap.get(rId) : undefined;
    if (target) orderedTargets.push(target);
  });

  if (orderedTargets.length === 0) {
    throw new Error("No slides found in this presentation.");
  }

  const slides: PptxSlideText[] = [];
  for (let i = 0; i < orderedTargets.length; i++) {
    const path = `ppt/${orderedTargets[i].replace(/^\.?\/*/, "")}`;
    const slideEntry = zip.file(path);
    if (!slideEntry) continue;

    const slideDoc = parseXml(await slideEntry.async("string"));
    const paragraphs = Array.from(slideDoc.getElementsByTagName("a:p"))
      .map((p) =>
        Array.from(p.getElementsByTagName("a:t"))
          .map((t) => t.textContent ?? "")
          .join(""),
      )
      .filter((text) => text.trim().length > 0);

    slides.push({ slideNumber: i + 1, paragraphs });
  }

  return slides;
}
