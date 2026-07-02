import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import AccountActions from "@/components/AccountActions";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?redirect=/account");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="text-2xl font-bold text-deep-ink">Your account</h1>

      <div className="card mt-6 p-6">
        <dl className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-ink/50">Email</dt>
            <dd className="text-sm text-deep-ink">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-ink/50">Plan</dt>
            <dd>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  user.plan === "premium"
                    ? "bg-node-blue/10 text-node-blue"
                    : "bg-ink/10 text-ink/60"
                }`}
              >
                {user.plan === "premium" ? "Premium" : "Free"}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {user.plan !== "premium" && (
        <div className="card mt-4 flex items-center justify-between gap-4 p-6">
          <div>
            <p className="font-medium text-deep-ink">Unlock premium tools</p>
            <p className="text-sm text-ink/60">AI Summarizer, Translate PDF, and more.</p>
          </div>
          <a href="/pricing" className="btn-primary shrink-0">
            See plans
          </a>
        </div>
      )}

      <AccountActions />
    </div>
  );
}
