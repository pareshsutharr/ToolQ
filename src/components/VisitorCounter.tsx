"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const SESSION_KEY = "toolq_visit_counted";
const COUNT_UP_MS = 1200;

// Live visitor counter for the homepage hero. Increments the shared Supabase
// counter once per browser session (so refreshes don't inflate it), then
// animates a count-up to the real total. Renders nothing until a real number is
// available — no fabricated figure is ever shown, and if Supabase isn't
// configured the counter simply stays hidden.
export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      try {
        // Count this visitor once per session; later loads just read the total.
        const alreadyCounted =
          typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY);

        if (!alreadyCounted) {
          const { data, error } = await supabase.rpc("increment_visits");
          const n = Number(data);
          if (!error && Number.isFinite(n)) {
            try {
              sessionStorage.setItem(SESSION_KEY, "1");
            } catch {
              // Private-mode storage failure is fine; worst case we double-count.
            }
            if (!cancelled) setCount(n);
            return;
          }
        }

        const { data } = await supabase
          .from("site_stats")
          .select("value")
          .eq("key", "visits")
          .single();
        const total = Number(data?.value);
        if (!cancelled && Number.isFinite(total)) setCount(total);
      } catch {
        // The counter is non-critical — never let it surface an error.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Ease the number up from 0 to the real total once it arrives.
  useEffect(() => {
    if (count == null) return;
    const target = count;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [count]);

  if (count == null) return null;

  return (
    <div className="mt-8 flex justify-center">
      <div
        className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-1.5 text-sm text-ink/70 shadow-sm backdrop-blur"
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-spark-lime opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-spark-lime" />
        </span>
        <span>
          <strong className="font-semibold tabular-nums text-deep-ink">
            {display.toLocaleString()}
          </strong>{" "}
          visits and counting
        </span>
      </div>
    </div>
  );
}
