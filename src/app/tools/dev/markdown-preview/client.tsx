"use client";

import { useEffect, useState } from "react";
import ToolShell from "@/components/ToolShell";

const DEFAULT_MARKDOWN = `# Heading\n\nType some **Markdown** here and see it rendered on the right.\n\n- List item one\n- List item two\n\n[A link](https://www.toolq.online)`;

export default function MarkdownPreviewPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    import("marked").then(({ marked }) => {
      const result = marked.parse(markdown, { async: false }) as string;
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [markdown]);

  return (
    <ToolShell title="Markdown Preview" description="Write Markdown and see the rendered output live.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Markdown</label>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="h-96 w-full resize-y rounded-lg border border-ink/15 bg-white p-3 font-mono text-xs outline-none focus:border-node-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Preview</label>
          <div
            className="h-96 max-w-none overflow-y-auto rounded-lg border border-ink/15 bg-white p-3 text-sm leading-relaxed [&_a]:text-node-blue [&_a]:underline [&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_h1]:mb-2 [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_pre]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface [&_pre]:p-2 [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </ToolShell>
  );
}
