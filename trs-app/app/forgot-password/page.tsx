import type { Metadata } from "next";
import { ForgotPasswordPageClient } from "@/components/auth/ForgotPasswordPageClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Forgot Password",
  description:
    "Request a secure password reset link or OTP for your TRS customer account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
