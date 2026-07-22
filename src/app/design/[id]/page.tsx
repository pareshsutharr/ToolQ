import type { Metadata } from "next";
import EditorClient from "./EditorClient";

// Editor URLs are per-user local documents — never index them.
export const metadata: Metadata = {
  title: "Design editor",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorClient id={id} />;
}
