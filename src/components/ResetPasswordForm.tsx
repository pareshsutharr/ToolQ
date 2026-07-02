"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export default function ResetPasswordForm() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
  }, []);

  if (!isSupabaseConfigured()) {
    return (
      <div className="card p-6 text-sm text-ink/70">
        Accounts aren&apos;t set up yet — password reset needs Supabase configured first.
      </div>
    );
  }

  if (done) {
    return (
      <div className="card p-6 text-sm text-ink/70">
        Your password has been updated. Redirecting you to sign in…
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="card p-6 text-sm text-ink/70">
        This reset link is invalid or has expired.{" "}
        <a href="/forgot-password" className="font-medium text-node-blue">
          Request a new one
        </a>
        .
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/sign-in");
    }, 1500);
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink/70">New password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink/70">Confirm password</label>
        <input
          type="password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
        />
      </div>
      {error && <p className="text-sm text-flag-red">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
