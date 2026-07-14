"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import ToolqMark from "@/components/ToolqMark";
import MegaMenu from "@/components/MegaMenu";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";

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
    <header className="w-full overflow-x-clip border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-w-0 max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <ToolqMark className="h-8 w-8 rounded-lg" />
          <span className="font-display text-lg font-semibold text-deep-ink">
            Tool<span className="text-node-blue">Q</span>
          </span>
        </Link>

        <MegaMenu />

        <Link href="/blog" className="hidden text-sm font-medium text-ink/70 hover:text-node-blue md:inline">
          Blog
        </Link>

        <div className="flex-1" />

        <SearchBar />
        <ThemeToggle />

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {!isSupabaseConfigured() ? null : email ? (
            <>
              <Link href="/admin" className="hidden text-sm text-ink/60 hover:text-node-blue sm:inline">
                Admin
              </Link>
              <Link href="/account" className="hidden text-sm text-ink/60 hover:text-node-blue sm:inline">
                {email}
              </Link>
              <button onClick={signOut} className="btn-secondary">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="btn-secondary hidden sm:inline-flex">
                Sign in
              </Link>
              <Link href="/sign-up" className="btn-primary px-3 sm:px-5">
                <span className="sm:hidden">Sign up</span>
                <span className="hidden sm:inline">Sign up free</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
