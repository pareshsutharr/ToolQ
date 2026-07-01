"use client";

import { useRef, useState } from "react";
import clsx from "clsx";

export default function Dropzone({
  accept,
  multiple = false,
  onFiles,
  label = "Drop files here or click to browse",
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFiles(Array.from(fileList));
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
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
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
