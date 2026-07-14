import { createImageBlock } from "../factory";
import type { Block, PageSize } from "../types";

const GRID = 4;
const LUMA_THRESHOLD = 214;
const MIN_REGION_PX = 28;
const MIN_REGION_AREA = 900;
const TEXT_MASK_PAD_X = 24;
const TEXT_MASK_PAD_Y = 16;

function isTextBlock(block: Block): boolean {
  return block.content.kind === "text" || block.content.kind === "heading";
}

function markTextMask(
  mask: Uint8Array,
  cols: number,
  rows: number,
  blocks: Block[],
  sx: number,
  sy: number,
) {
  for (const block of blocks.filter(isTextBlock)) {
    const x0 = Math.max(0, Math.floor((block.position.x * sx - TEXT_MASK_PAD_X) / GRID));
    const y0 = Math.max(0, Math.floor((block.position.y * sy - TEXT_MASK_PAD_Y) / GRID));
    const x1 = Math.min(
      cols - 1,
      Math.ceil(((block.position.x + block.dimensions.width) * sx + TEXT_MASK_PAD_X) / GRID),
    );
    const y1 = Math.min(
      rows - 1,
      Math.ceil(((block.position.y + block.dimensions.height) * sy + TEXT_MASK_PAD_Y) / GRID),
    );
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) mask[y * cols + x] = 1;
    }
  }
}

function overlapsTextRegion(
  x: number,
  y: number,
  width: number,
  height: number,
  block: Block,
  sx: number,
  sy: number,
): boolean {
  const bx = block.position.x * sx - TEXT_MASK_PAD_X;
  const by = block.position.y * sy - TEXT_MASK_PAD_Y;
  const bw = block.dimensions.width * sx + TEXT_MASK_PAD_X * 2;
  const bh = block.dimensions.height * sy + TEXT_MASK_PAD_Y * 2;
  const ix = Math.max(0, Math.min(x + width, bx + bw) - Math.max(x, bx));
  const iy = Math.max(0, Math.min(y + height, by + bh) - Math.max(y, by));
  return ix * iy > width * height * 0.12;
}

function looksLikeTextCrop(
  x: number,
  y: number,
  width: number,
  height: number,
  textBlocks: Block[],
  sx: number,
  sy: number,
): boolean {
  if (width > height * 5.5) return true;
  return textBlocks.some((block) => overlapsTextRegion(x, y, width, height, block, sx, sy));
}

function cropCanvas(canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): string {
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
  return out.toDataURL("image/png");
}

export function detectVisualBlocks(
  canvas: HTMLCanvasElement,
  textBlocks: Block[],
  pageSize: PageSize,
): Block[] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  const sx = canvas.width / pageSize.widthPt;
  const sy = canvas.height / pageSize.heightPt;
  const cols = Math.ceil(canvas.width / GRID);
  const rows = Math.ceil(canvas.height / GRID);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const mask = new Uint8Array(cols * rows);
  markTextMask(mask, cols, rows, textBlocks, sx, sy);

  const dark = new Uint8Array(cols * rows);
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      if (mask[gy * cols + gx]) continue;
      const px = Math.min(canvas.width - 1, gx * GRID);
      const py = Math.min(canvas.height - 1, gy * GRID);
      const i = (py * canvas.width + px) * 4;
      const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (luma < LUMA_THRESHOLD) dark[gy * cols + gx] = 1;
    }
  }

  const seen = new Uint8Array(cols * rows);
  const blocks: Block[] = [];
  const stack: number[] = [];

  for (let start = 0; start < dark.length; start += 1) {
    if (!dark[start] || seen[start]) continue;
    seen[start] = 1;
    stack.push(start);
    let minX = cols;
    let minY = rows;
    let maxX = 0;
    let maxY = 0;

    while (stack.length) {
      const idx = stack.pop()!;
      const x = idx % cols;
      const y = Math.floor(idx / cols);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (const next of [idx - 1, idx + 1, idx - cols, idx + cols]) {
        if (next < 0 || next >= dark.length || seen[next] || !dark[next]) continue;
        const nx = next % cols;
        if (Math.abs(nx - x) > 1) continue;
        seen[next] = 1;
        stack.push(next);
      }
    }

    const x = Math.max(0, minX * GRID - 4);
    const y = Math.max(0, minY * GRID - 4);
    const width = Math.min(canvas.width - x, (maxX - minX + 1) * GRID + 8);
    const height = Math.min(canvas.height - y, (maxY - minY + 1) * GRID + 8);
    if (width < MIN_REGION_PX || height < MIN_REGION_PX || width * height < MIN_REGION_AREA) continue;
    if (width > canvas.width * 0.9 || height > canvas.height * 0.9) continue;
    if (height < 10 || width / Math.max(1, height) > 30 || height / Math.max(1, width) > 30) continue;
    if (looksLikeTextCrop(x, y, width, height, textBlocks, sx, sy)) continue;

    const dataUrl = cropCanvas(canvas, x, y, width, height);
    if (!dataUrl) continue;
    const image = createImageBlock(dataUrl, {
      width: width / sx,
      height: height / sy,
    });
    image.position = { x: x / sx, y: y / sy };
    image.metadata.source = "ocr";
    blocks.push(image);
  }

  return blocks;
}
