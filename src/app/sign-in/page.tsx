import type { Metadata } from "next";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-center font-display text-2xl font-bold text-deep-ink">
        Sign in to toolq
      </h1>
      <AuthForm mode="sign-in" />
      <p className="mt-4 text-center text-sm text-ink/60">
        No account?{" "}
        <Link href="/sign-up" className="font-medium text-node-blue">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
