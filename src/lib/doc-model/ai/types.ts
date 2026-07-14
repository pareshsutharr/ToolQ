export type AiBlockKind = "heading" | "paragraph" | "list" | "table" | "image";

export interface AiBounds {
  /** Normalized page coordinates in the range 0..1, measured from top-left. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AiRebuildBlock {
  kind: AiBlockKind;
  bounds: AiBounds;
  text?: string;
  level?: number;
  ordered?: boolean;
  items?: string[];
  rows?: string[][];
  caption?: string;
  fontSize?: number;
  alignment?: "left" | "center" | "right" | "justify";
}

export interface AiRebuildPage {
  blocks: AiRebuildBlock[];
}

