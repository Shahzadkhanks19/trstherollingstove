import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Order for pickup",
  description: "Online pickup ordering will connect to the existing backend.",
};

export default function Page() {
  return (
    <section className="placeholder-page">
      <div className="container placeholder-card">
        <span className="eyebrow">TRS Platform</span>
        <h1>Order for pickup</h1>
        <p>Online pickup ordering will connect to the existing backend.</p>
        <Link className="button button-primary" href="/">
          Back to home
        </Link>
      </div>
    </section>
  );
}
