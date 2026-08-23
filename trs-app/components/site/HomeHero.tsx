import Image from "next/image";
import Link from "next/link";

import { ArrowIcon, StarIcon } from "@/components/icons/BrandIcons";

export function HomeHero() {
  return (
    <section className="home-hero">
      <div className="hero-grid-pattern" />
      <div className="hero-red-glow" />

      <div className="container hero-layout">
        <div className="hero-copy">
          <div className="hero-rating">
            <span className="rating-stars">
              {Array.from({ length: 5 }).map((_, index) => (
                <StarIcon key={index} />
              ))}
            </span>
            <span>Jodhpur-born vegetarian food truck</span>
          </div>

          <span className="eyebrow">The Rolling Stove</span>
          <h1>
            Street food,
            <span>crafted like a signature.</span>
          </h1>
          <p>
            Handmade pizzas, comforting pastas, loaded fries, indulgent
            desserts and bold Indian favourites—served fresh from the
            truck.
          </p>

          <div className="hero-actions">
            <Link className="button button-primary" href="/menu">
              Order for pickup
              <ArrowIcon />
            </Link>
            <Link className="button button-secondary" href="/menu">
              Explore the menu
            </Link>
          </div>

          <div className="hero-facts">
            <div>
              <strong>100%</strong>
              <span>Vegetarian</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Pizza sizes</span>
            </div>
            <div>
              <strong>5%</strong>
              <span>TRS Coins</span>
            </div>
          </div>
        </div>

        <div className="hero-art" aria-label="The Rolling Stove brand artwork">
          <div className="hero-logo-disc">
            <Image
              src="/images/trs-logo.png"
              alt="The Rolling Stove Pizzeria"
              width={520}
              height={520}
              priority
            />
          </div>

          <div className="hero-card hero-card-one">
            <span>Best seller</span>
            <strong>Cheese Burst Pizza</strong>
          </div>

          <div className="hero-card hero-card-two">
            <span>Also serving</span>
            <strong>Chur-chur Naan</strong>
          </div>

          <div className="hero-stamp">
            <span>Fresh</span>
            <strong>from the stove</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
