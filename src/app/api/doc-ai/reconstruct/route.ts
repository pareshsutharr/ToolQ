import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { AiRebuildPage } from "@/lib/doc-model/ai/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BASE64_CHARS = 7_000_000;
const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const RECONSTRUCTION_TOOL = {
  name: "return_document_page",
  description: "Return the page as ordered, editable document blocks.",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    properties: {
      blocks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: { type: "string", enum: ["heading", "paragraph", "list", "table", "image"] },
            bounds: {
              type: "object",
              additionalProperties: false,
              properties: {
                x: { type: "number", minimum: 0, maximum: 1 },
                y: { type: "number", minimum: 0, maximum: 1 },
                width: { type: "number", minimum: 0.001, maximum: 1 },
                height: { type: "number", minimum: 0.001, maximum: 1 },
              },
              required: ["x", "y", "width", "height"],
            },
            text: { type: "string" },
            level: { type: "integer", minimum: 1, maximum: 3 },
            ordered: { type: "boolean" },
            items: { type: "array", items: { type: "string" } },
            rows: { type: "array", items: { type: "array", items: { type: "string" } } },
            caption: { type: "string" },
            fontSize: { type: "number", minimum: 6, maximum: 72 },
            alignment: { type: "string", enum: ["left", "center", "right", "justify"] },
          },
          required: ["kind", "bounds"],
        },
      },
    },
    required: ["blocks"],
  },
};

function validResult(input: unknown): input is AiRebuildPage {
  if (!input || typeof input !== "object") return false;
  const blocks = (input as { blocks?: unknown }).blocks;
  return Array.isArray(blocks) && blocks.every((block) => {
    if (!block || typeof block !== "object") return false;
    const candidate = block as { kind?: unknown; bounds?: unknown };
    return typeof candidate.kind === "string" && candidate.bounds !== null && typeof candidate.bounds === "object";
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI rebuild isn't enabled on this server. Set ANTHROPIC_API_KEY in .env.local." },
      { status: 501 },
    );
  }

  let body: { imageBase64?: unknown; mimeType?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  if (
    typeof body.imageBase64 !== "string" ||
    !body.imageBase64 ||
    body.imageBase64.length > MAX_IMAGE_BASE64_CHARS ||
    typeof body.mimeType !== "string" ||
    !MEDIA_TYPES.has(body.mimeType)
  ) {
    return NextResponse.json({ error: "A supported page image is required." }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514",
      max_tokens: 8192,
      temperature: 0,
      system:
        "You reconstruct document page images into clean editable structure. Transcribe exactly; never summarize, correct, or invent text. Return blocks in reading order. Coordinates are normalized 0..1 from the top-left. Mark photos, logos, diagrams, charts, stamps, and other meaningful graphics as image blocks so the client can crop the original pixels. Ignore decorative rules and page backgrounds. Preserve tables as rectangular row arrays and lists as item arrays.",
      tools: [RECONSTRUCTION_TOOL],
      tool_choice: { type: "tool", name: RECONSTRUCTION_TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: body.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: body.imageBase64,
              },
            },
            {
              type: "text",
              text: "Rebuild this page. Include every visible textual and meaningful visual element exactly once.",
            },
          ],
        },
      ],
    });
    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use" && block.name === RECONSTRUCTION_TOOL.name,
    );
    if (!toolUse || !validResult(toolUse.input)) {
      return NextResponse.json({ error: "Claude returned an invalid document structure." }, { status: 502 });
    }
    return NextResponse.json(toolUse.input);
  } catch (error) {
    const status = error instanceof Anthropic.APIError ? error.status : undefined;
    if (status === 401) {
      return NextResponse.json({ error: "The Anthropic API key is invalid or revoked." }, { status: 401 });
    }
    if (status === 429) {
      return NextResponse.json({ error: "Anthropic's rate limit was reached. Please try again shortly." }, { status: 429 });
    }
    if (status && status >= 400 && status < 500) {
      return NextResponse.json({ error: "Anthropic rejected this page image or request." }, { status: 400 });
    }
    return NextResponse.json({ error: "Claude couldn't rebuild this page. Please try again." }, { status: 502 });
  }
}

