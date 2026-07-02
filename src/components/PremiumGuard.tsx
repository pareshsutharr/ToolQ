import { getCurrentUser } from "@/lib/profile";
import { findTool, type ToolCategory } from "@/lib/tools-catalog";
import PremiumLock from "@/components/PremiumLock";

export default async function PremiumGuard({
  category,
  slug,
  children,
}: {
  category: ToolCategory;
  slug: string;
  children: React.ReactNode;
}) {
  const tool = findTool(category, slug);
  const user = await getCurrentUser();

  if (user?.plan !== "premium") {
    return <PremiumLock title={tool?.name ?? "Premium tool"} signedIn={Boolean(user)} />;
  }

  return <>{children}</>;
}
