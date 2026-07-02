import Link from "next/link";
import { Lock } from "lucide-react";

export default function PremiumLock({
  title,
  signedIn,
}: {
  title: string;
  signedIn: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="text-center font-display text-3xl font-bold text-deep-ink">{title}</h1>
      <div className="card mt-8 flex flex-col items-center gap-4 p-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-node-blue/10 text-node-blue">
          <Lock className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-deep-ink">This is a premium tool</p>
          <p className="mt-1 text-sm text-ink/60">
            {signedIn
              ? "Upgrade your account to unlock it."
              : "Sign in and upgrade to unlock it."}
          </p>
        </div>
        <div className="flex gap-3">
          {!signedIn && (
            <Link href="/sign-in" className="btn-secondary">
              Sign in
            </Link>
          )}
          <Link href="/pricing" className="btn-primary">
            See plans
          </Link>
        </div>
      </div>
    </div>
  );
}
