import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordPageClient } from "@/components/auth/ResetPasswordPageClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Reset Password",
  description:
    "Securely verify your reset request and create a new TRS customer account password.",
};

function ResetPasswordLoading() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#FFFDF9] px-4 text-[#172536]">
      <div className="rounded-2xl border border-[#EDE3D8] bg-white px-6 py-5 text-sm font-bold shadow-sm">
        Loading secure reset page...
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordPageClient />
    </Suspense>
  );
}
