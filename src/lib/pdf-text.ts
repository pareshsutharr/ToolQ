function itemsToText(items: unknown[]): string {
  let text = "";
  let lastY: number | null = null;
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item) || !("transform" in item)) continue;
    const { str, transform } = item as { str: string; transform: number[] };
    const y = transform[5];
    if (lastY !== null && Math.abs(y - lastY) > 2) {
      text += "\n";
    } else if (text && !text.endsWith("\n") && !text.endsWith(" ")) {
      text += " ";
    }
    text += str;
    lastY = y;
  }
  return text;
}

export async function extractPdfText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
): Promise<string[]> {
  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    pages.push(itemsToText(content.items));
  }
  return pages;
}
