import Link from "next/link";

import { ArrowIcon } from "@/components/icons/BrandIcons";
import { SectionHeading } from "@/components/ui/SectionHeading";

const dishes = [
  {
    category: "Pizza",
    title: "Cheese Burst",
    description:
      "Corn, olives, jalapeño, tomato, capsicum and chilli with an indulgent cheese-filled centre.",
    className: "dish-pizza",
    badge: "Bestseller",
  },
  {
    category: "Pasta",
    title: "Pink Sauce",
    description:
      "A rich combination of red and white sauce with a smooth, comforting finish.",
    className: "dish-pasta",
    badge: "TRS favourite",
  },
  {
    category: "Fries",
    title: "TRS Special",
    description:
      "Loaded fries built around the bold sauces and seasoning that define the brand.",
    className: "dish-fries",
    badge: "Must try",
  },
  {
    category: "Chur-chur Naan",
    title: "Cheese Chilli Garlic",
    description:
      "Crisp, flaky, buttery and generously stuffed for a full comfort-food experience.",
    className: "dish-naan",
    badge: "Food truck special",
  },
];

export function FeaturedMenu() {
  return (
    <section className="section featured-menu">
      <div className="container">
        <div className="section-heading-row">
          <SectionHeading
            eyebrow="TRS signatures"
            title="The dishes that built the following."
            description="A focused selection of the flavours people associate most strongly with The Rolling Stove."
          />

          <Link className="text-link desktop-only" href="/menu">
            View complete menu
            <ArrowIcon />
          </Link>
        </div>

        <div className="featured-grid">
          {dishes.map((dish, index) => (
            <article
              className={`featured-card ${dish.className}`}
              key={dish.title}
            >
              <div className="featured-art">
                <span className="dish-badge">{dish.badge}</span>
                <div className="food-illustration">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
              </div>
              <div className="featured-content">
                <span>{dish.category}</span>
                <h3>{dish.title}</h3>
                <p>{dish.description}</p>
                <Link href="/menu">
                  View dish
                  <ArrowIcon />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <Link
          className="button button-outline-light mobile-only featured-mobile-link"
          href="/menu"
        >
          View complete menu
          <ArrowIcon />
        </Link>
      </div>
    </section>
  );
}
