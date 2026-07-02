"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccountActions() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      setError(body.error ?? "Couldn't delete your account.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <button onClick={signOut} className="btn-secondary self-start">
        Sign out
      </button>

      <div className="card border-flag-red/20 p-6">
        <p className="font-medium text-deep-ink">Delete account</p>
        <p className="mt-1 text-sm text-ink/60">
          Permanently deletes your account and sign-in access. This can&apos;t be undone.
        </p>
        {error && <p className="mt-2 text-sm text-flag-red">{error}</p>}
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="mt-4 rounded-lg border border-flag-red/30 px-4 py-2 text-sm font-semibold text-flag-red hover:bg-flag-red/5"
          >
            Delete my account
          </button>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="rounded-lg bg-flag-red px-4 py-2 text-sm font-semibold text-white hover:bg-flag-red/90 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, delete it"}
            </button>
            <button onClick={() => setConfirming(false)} className="text-sm text-ink/60">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
