import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { isAdminEmail, getAdminEmails } from "@/lib/admin";
import { tools, categories } from "@/lib/tools-catalog";
import AdminToolsTable from "./AdminToolsTable";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    return (
      <Shell>
        <Denied
          title="Supabase isn't configured"
          message="Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in and admin access."
        />
      </Shell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirect=/admin");
  }

  if (!isAdminEmail(user.email)) {
    return (
      <Shell>
        <Denied
          title="Access denied"
          message={`${user.email} isn't on the admin allowlist. Add it to the ADMIN_EMAILS environment variable to unlock this page.`}
        />
      </Shell>
    );
  }

  const freeCount = tools.filter((t) => t.premium === "free").length;
  const partialCount = tools.filter((t) => t.premium === "partial").length;
  const premiumCount = tools.filter((t) => t.premium === "premium").length;
  const sitemapUrlCount = 1 + categories.length + tools.length;

  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /^https:\/\/([^.]+)\.supabase\.co/,
  )?.[1];
  const supabaseUsersUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/auth/users`
    : "https://supabase.com/dashboard";

  return (
    <Shell>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-deep-ink">Admin</h1>
          <p className="text-sm text-ink/60">Signed in as {user.email}</p>
        </div>
        <Link href="/" className="btn-secondary">
          Back to site
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total tools" value={tools.length} />
        <StatCard label="Categories" value={categories.length} />
        <StatCard label="Free" value={freeCount} />
        <StatCard label="Partial" value={partialCount} />
        <StatCard label="Premium" value={premiumCount} />
        <StatCard label="Sitemap URLs" value={sitemapUrlCount} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Site health">
          <Row label="Supabase">
            <Badge ok={isSupabaseConfigured()} />
          </Row>
          <Row label="Admin allowlist">
            <span className="text-sm text-ink/70">
              {getAdminEmails().length} email{getAdminEmails().length === 1 ? "" : "s"}
            </span>
          </Row>
          <Row label="Environment">
            <span className="text-sm text-ink/70">{process.env.NODE_ENV}</span>
          </Row>
          <Row label="Sitemap">
            <a href="/sitemap.xml" target="_blank" className="text-sm text-node-blue hover:underline">
              /sitemap.xml →
            </a>
          </Row>
          <Row label="Robots">
            <a href="/robots.txt" target="_blank" className="text-sm text-node-blue hover:underline">
              /robots.txt →
            </a>
          </Row>
          <Row label="Manifest">
            <a href="/manifest.webmanifest" target="_blank" className="text-sm text-node-blue hover:underline">
              /manifest.webmanifest →
            </a>
          </Row>
        </Panel>

        <Panel title="Your account">
          <Row label="Email">
            <span className="text-sm text-ink/70">{user.email}</span>
          </Row>
          <Row label="Provider">
            <span className="text-sm text-ink/70">{user.app_metadata?.provider ?? "email"}</span>
          </Row>
          <Row label="User ID">
            <span className="truncate text-sm text-ink/50">{user.id}</span>
          </Row>
          <Row label="Created">
            <span className="text-sm text-ink/70">
              {user.created_at ? new Date(user.created_at).toLocaleString() : "—"}
            </span>
          </Row>
          <Row label="Last sign-in">
            <span className="text-sm text-ink/70">
              {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}
            </span>
          </Row>
        </Panel>
      </div>

      <div className="mb-8">
        <Panel title="User directory" locked>
          <p className="text-sm text-ink/60">
            Listing all signed-up users requires the Supabase{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-xs">service_role</code> key, which
            isn&apos;t configured yet. Add{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            (from Supabase → Settings → API — keep it server-only, never expose it with a{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-xs">NEXT_PUBLIC_</code> prefix) to
            unlock a full user list here. Until then, manage users directly from the{" "}
            <a href={supabaseUsersUrl} target="_blank" className="text-node-blue hover:underline">
              Supabase dashboard
            </a>
            .
          </p>
        </Panel>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-deep-ink">Tools catalog</h2>
        <AdminToolsTable />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-6 py-14">{children}</div>;
}

function Denied({ title, message }: { title: string; message: string }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-bold text-deep-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink/60">{message}</p>
      <Link href="/" className="btn-secondary mt-6 inline-flex">
        Back to site
      </Link>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-bold text-deep-ink">{value}</p>
      <p className="text-xs text-ink/50">{label}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  locked,
}: {
  title: string;
  children: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
        {title}
        {locked && <span className="rounded-full bg-amber/10 px-2 py-0.5 text-[10px] text-amber">locked</span>}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink/50">{label}</span>
      {children}
    </div>
  );
}

function Badge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-spark-lime/10 text-spark-lime" : "bg-flag-red/10 text-flag-red"
      }`}
    >
      {ok ? "Connected" : "Not configured"}
    </span>
  );
}
