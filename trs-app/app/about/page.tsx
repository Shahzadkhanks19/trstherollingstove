import type { Metadata } from "next";
import { AboutPage } from "@/components/about/AboutPage";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Discover the story of The Rolling Stove, Jodhpur's vegetarian food truck serving fresh pizzas, pastas, chur-chur naan and more since 2016.",
};

export default function About() {
  return <AboutPage />;
}
