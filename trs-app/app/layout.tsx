import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  preload: false,
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "The Rolling Stove | Premium Vegetarian Food Truck",
    template: "%s | The Rolling Stove",
  },
  description:
    "A premium vegetarian food truck in Jodhpur serving handcrafted pizzas, pastas, fries, brownies, mocktails and chur-chur naan.",
  applicationName: "The Rolling Stove",
  category: "food",
  icons: {
    icon: [
      { url: "/images/trs-logo.png", type: "image/png" },
    ],
    shortcut: "/images/trs-logo.png",
    apple: "/images/trs-logo.png",
  },
  keywords: [
    "The Rolling Stove",
    "TRS Jodhpur",
    "food truck Jodhpur",
    "vegetarian food truck",
    "pizza Jodhpur",
    "pasta Jodhpur",
    "chur chur naan Jodhpur",
    "takeaway Jodhpur",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "The Rolling Stove",
    title: "The Rolling Stove | Premium Vegetarian Food Truck",
    description:
      "Handcrafted vegetarian comfort food, built on wheels and loved in Jodhpur.",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Rolling Stove | Premium Vegetarian Food Truck",
    description:
      "Handcrafted vegetarian comfort food, built on wheels and loved in Jodhpur.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C8102E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${cormorant.variable}`}
    >
      <body className="min-h-screen bg-[#FFF8F2] font-[family-name:var(--font-manrope)] text-[#1F1F1F] antialiased">
        <a className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-full bg-[#A50E27] px-5 py-3 text-sm font-bold text-white transition-transform focus:translate-y-0" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
