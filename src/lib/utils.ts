import { clsx, type ClassValue } from "clsx";

/**
 * `cn` — the class-name helper shadcn-style components import from
 * "@/lib/utils". This project uses clsx directly elsewhere; this is a thin
 * clsx wrapper (no tailwind-merge) so the ui/ primitives resolve their import.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
