"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { categories } from "@/lib/tools-catalog";
import ToolqMark from "@/components/ToolqMark";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
  }

  return (
    <header className="border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <ToolqMark className="h-8 w-8 rounded-lg" />
          <span className="font-display text-lg font-semibold text-deep-ink">
            Tool<span className="text-node-blue">Q</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink/70 md:flex">
          {categories.map((c) => (
            <Link key={c.id} href={`/tools/${c.id}`} className="hover:text-node-blue">
              {c.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {!isSupabaseConfigured() ? null : email ? (
            <>
              <span className="hidden text-sm text-ink/60 sm:inline">{email}</span>
              <button onClick={signOut} className="btn-secondary">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="btn-secondary">
                Sign in
              </Link>
              <Link href="/sign-up" className="btn-primary">
                Sign up free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
