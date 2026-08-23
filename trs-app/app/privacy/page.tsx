import type { Metadata } from "next";
import { PrivacyPolicyPage } from "@/components/legal/PrivacyPolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read how The Rolling Stove collects, uses, stores and protects personal information across its website, ordering, rewards and customer-support services.",
};

export default function PrivacyPage() {
  return <PrivacyPolicyPage />;
}
