interface PositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

function getPositionedItems(items: unknown[]): PositionedItem[] {
  const result: PositionedItem[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item) || !("transform" in item)) continue;
    const { str, transform, width } = item as { str: string; transform: number[]; width?: number };
    if (!str.trim()) continue;
    result.push({ str, x: transform[4], y: transform[5], width: width ?? 0 });
  }
  return result;
}

// PDF content streams don't have to draw text in visual reading order —
// many report/spreadsheet-exported PDFs draw table cells column-by-column
// or bottom-to-top. Sorting by position (top-to-bottom, then left-to-right)
// before reconstructing lines is what makes tabular PDFs extractable at all.
function groupIntoRows(items: PositionedItem[], yTolerance = 3): PositionedItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedItem[][] = [];
  for (const item of sorted) {
    const row = rows.find((r) => Math.abs(r[0].y - item.y) <= yTolerance);
    if (row) row.push(item);
    else rows.push([item]);
  }
  rows.forEach((row) => row.sort((a, b) => a.x - b.x));
  return rows;
}

export async function extractPdfText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
): Promise<string[]> {
  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const rows = groupIntoRows(getPositionedItems(content.items));
    const lines = rows.map((row) =>
      row
        .map((it) => it.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    pages.push(lines.join("\n"));
  }
  return pages;
}

// Gap (in PDF points) between the end of one text run and the start of the
// next, beyond which we treat them as separate table cells rather than
// words in the same cell. Report/spreadsheet-exported PDFs consistently
// draw each cell's full text (even multi-word) as a single pdfjs item, so
// *any* positive gap between two separate items — even under a point —
// almost always marks a real cell boundary, not a word break within one
// cell (those come pre-joined in a single item). Only truly touching or
// overlapping runs (gap <= 0, e.g. split glyph fragments of one word) get
// joined. Splitting too eagerly costs an extra column; merging two
// unrelated values into one cell silently corrupts the data — the former
// is the far safer failure mode for a spreadsheet.
const COLUMN_GAP_THRESHOLD = 0;

// Justified prose (e.g. legal disclaimers) is sometimes drawn as one pdfjs
// item per word to achieve even spacing — position alone can't tell that
// apart from a genuine multi-column table row by cell count alone (a wide
// financial table can easily have 15+ real columns). What does reliably
// tell them apart is the *ratio* of the gap between items to their width:
// justified word-spacing is a small fraction of a word's width (measured
// ~0.25 on real report disclaimers), while deliberately padded table
// columns leave a gap comparable to or wider than the cell content itself
// (measured ~2.6 on real multi-column tables) — roughly a 10x difference.
const MIN_CELLS_TO_CHECK_FOR_PROSE = 8;
const PROSE_GAP_TO_WIDTH_RATIO = 0.75;

function looksLikeProseRow(row: PositionedItem[]): boolean {
  if (row.length < MIN_CELLS_TO_CHECK_FOR_PROSE) return false;
  const gaps: number[] = [];
  for (let i = 1; i < row.length; i++) {
    gaps.push(row[i].x - (row[i - 1].x + row[i - 1].width));
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const avgWidth = row.reduce((a, it) => a + it.width, 0) / row.length;
  if (avgWidth <= 0) return false;
  return avgGap / avgWidth < PROSE_GAP_TO_WIDTH_RATIO;
}

function splitRowIntoCells(row: PositionedItem[]): string[] {
  const cells: string[] = [];
  let current = row[0]?.str ?? "";
  for (let i = 1; i < row.length; i++) {
    const gap = row[i].x - (row[i - 1].x + row[i - 1].width);
    if (gap > COLUMN_GAP_THRESHOLD) {
      cells.push(current.trim());
      current = row[i].str;
    } else {
      // Touching or overlapping runs are almost always split glyph
      // fragments of one word, so rejoin without inserting a space.
      current += row[i].str;
    }
  }
  if (current.trim()) cells.push(current.trim());
  return cells;
}

export async function extractPdfRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
): Promise<string[][][]> {
  const pages: string[][][] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const rows = groupIntoRows(getPositionedItems(content.items));
    const grid = rows.map((row) => {
      if (looksLikeProseRow(row)) {
        return [row.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim()];
      }
      return splitRowIntoCells(row);
    });
    pages.push(grid);
  }
  return pages;
}
