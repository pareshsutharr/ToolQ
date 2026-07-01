import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-center font-display text-2xl font-bold text-deep-ink">
        Create your free account
      </h1>
      <AuthForm mode="sign-up" />
      <p className="mt-4 text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-node-blue">
          Sign in
        </Link>
      </p>
    </div>
  );
}
