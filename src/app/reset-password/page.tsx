import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-center font-display text-2xl font-bold text-deep-ink">
        Set a new password
      </h1>
      <ResetPasswordForm />
    </div>
  );
}
