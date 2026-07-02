import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export type Plan = "free" | "premium";

export interface CurrentUser {
  id: string;
  email: string | null;
  plan: Plan;
}

/**
 * Reads the signed-in user + their plan. Falls back to `null`/"free" instead
 * of throwing if Supabase isn't configured or the `profiles` table/migration
 * hasn't been applied yet — premium tools should degrade to "locked, sign in
 * to check access" rather than 500.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let plan: Plan = "free";
  try {
    const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
    if (data?.plan === "premium") plan = "premium";
  } catch {
    // profiles table not migrated yet — treat as free rather than erroring.
  }

  return { id: user.id, email: user.email ?? null, plan };
}
