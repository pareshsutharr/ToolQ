import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { tools } from "@/lib/tools-catalog";
import { getCurrentUser } from "@/lib/profile";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pricing - Free Online Tools and Premium AI Tools",
  description:
    "Most toolQ PDF, image, developer, generator and calculator tools are free. Premium AI PDF tools are available through early access.",
  alternates: { canonical: absoluteUrl("/pricing") },
  openGraph: {
    title: "Pricing - Free Online Tools and Premium AI Tools",
    description:
      "Most toolQ tools are free forever. Premium unlocks early-access AI-powered PDF workflows.",
    url: absoluteUrl("/pricing"),
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "toolQ pricing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - Free Online Tools and Premium AI Tools",
    description:
      "Most toolQ tools are free forever. Premium unlocks early-access AI-powered PDF workflows.",
    images: [DEFAULT_OG_IMAGE],
  },
};

const SUPPORT_EMAIL = "hello@toolq.online";

export default async function PricingPage() {
  const user = await getCurrentUser();
  const premiumTools = tools.filter((t) => t.premium === "premium");
  const isPremium = user?.plan === "premium";

  const upgradeHref = user
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Upgrade to toolq Premium")}&body=${encodeURIComponent(
        `Hi — please upgrade my account (${user.email}) to Premium.`,
      )}`
    : "/sign-up";

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-deep-ink sm:text-4xl">
          Simple pricing
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-ink/60">
          Every everyday tool is free, forever. Upgrade only if you want the AI-powered ones.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-deep-ink">Free</h2>
          <p className="mt-1 text-3xl font-bold text-deep-ink">$0</p>
          <p className="text-sm text-ink/50">forever</p>
          <ul className="mt-6 flex flex-col gap-3 text-sm text-ink/70">
            <Feature>All 48 everyday PDF, image, developer, generator and calculator tools</Feature>
            <Feature>Everything runs in your browser — nothing uploaded</Feature>
            <Feature>No account required for most tools</Feature>
          </ul>
          <Link href="/" className="btn-secondary mt-8 w-full">
            Browse free tools
          </Link>
        </div>

        <div className="card border-node-blue/30 p-8 ring-1 ring-node-blue/20">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-deep-ink">
            Premium
            <span className="rounded-full bg-node-blue/10 px-2 py-0.5 text-xs text-node-blue">
              AI-powered
            </span>
          </h2>
          <p className="mt-1 text-3xl font-bold text-deep-ink">Contact us</p>
          <p className="text-sm text-ink/50">early access, pricing TBD</p>
          <ul className="mt-6 flex flex-col gap-3 text-sm text-ink/70">
            {premiumTools.map((t) => (
              <Feature key={t.slug}>{t.name}</Feature>
            ))}
            <Feature>Priority support</Feature>
          </ul>
          {isPremium ? (
            <span className="btn-primary mt-8 w-full cursor-default opacity-70">
              You&apos;re on Premium
            </span>
          ) : (
            <a href={upgradeHref} className="btn-primary mt-8 w-full">
              {user ? "Request upgrade" : "Sign up to upgrade"}
            </a>
          )}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-ink/40">
        Premium billing isn&apos;t automated yet — upgrade requests are handled manually while
        we finish payments.
      </p>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-node-blue" />
      {children}
    </li>
  );
}
