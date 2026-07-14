"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { UploadCloud } from "lucide-react";

export default function Dropzone({
  accept,
  multiple = false,
  onFiles,
  label = "Drop files here or click to browse",
  variant = "default",
  cta = "Select file",
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  /** "hero" is a large, friendly upload area with a prominent CTA button. */
  variant?: "default" | "hero";
  /** Button text shown in the hero variant. */
  cta?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFiles(Array.from(fileList));
  }

  const zoneProps = {
    onClick: () => inputRef.current?.click(),
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      className="hidden"
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  if (variant === "hero") {
    return (
      <div
        {...zoneProps}
        className={clsx(
          "group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition",
          dragging
            ? "border-node-blue bg-node-blue/5"
            : "border-ink/20 bg-white hover:border-node-blue/50 hover:bg-node-blue/[0.02]",
        )}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-node-blue/10 text-node-blue transition group-hover:scale-105">
          <UploadCloud className="h-8 w-8" />
        </span>
        <span className="btn-primary pointer-events-none px-8 py-3 text-base shadow-sm">{cta}</span>
        <p className="text-sm text-ink/60">{label}</p>
        <p className="text-xs text-ink/40">Files stay in your browser — nothing is uploaded</p>
        {fileInput}
      </div>
    );
  }

  return (
    <div
      {...zoneProps}
      className={clsx(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-14 text-center transition",
        dragging
          ? "border-node-blue bg-node-blue/5"
          : "border-ink/15 bg-white hover:border-node-blue/50",
      )}
    >
      <span className="text-3xl">📁</span>
      <p className="text-sm font-medium text-ink/70">{label}</p>
      <p className="text-xs text-ink/40">Files stay in your browser — nothing is uploaded</p>
      {fileInput}
    </div>
  );
}
