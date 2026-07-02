import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-2 text-center font-display text-2xl font-bold text-deep-ink">
        Reset your password
      </h1>
      <p className="mb-6 text-center text-sm text-ink/60">
        We&apos;ll email you a link to set a new one.
      </p>
      <ForgotPasswordForm />
      <p className="mt-4 text-center text-sm text-ink/60">
        <Link href="/sign-in" className="font-medium text-node-blue">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
