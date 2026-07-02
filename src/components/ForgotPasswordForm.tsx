"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="card p-6 text-sm text-ink/70">
        Accounts aren&apos;t set up yet — password reset needs Supabase configured first.
      </div>
    );
  }

  if (sent) {
    return (
      <div className="card p-6 text-sm text-ink/70">
        If an account exists for <strong>{email}</strong>, a reset link is on its way. Check
        your inbox.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    // Don't reveal whether the email exists — always show the same success state.
    if (error && error.status && error.status >= 500) {
      setError("Something went wrong sending that email. Try again in a moment.");
      return;
    }
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink/70">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
        />
      </div>
      {error && <p className="text-sm text-flag-red">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
