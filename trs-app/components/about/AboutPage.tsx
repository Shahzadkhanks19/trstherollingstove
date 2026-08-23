import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faHeart,
  faLeaf,
  faLocationDot,
  faPizzaSlice,
  faSmile,
  faTruckFast,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";

const heroHighlights = [
  {
    icon: faLeaf,
    title: "100% Vegetarian",
    text: "Pure vegetarian goodness",
  },
  {
    icon: faUtensils,
    title: "Fresh & Hygienic",
    text: "Prepared with care",
  },
  {
    icon: faHeart,
    title: "Made With Love",
    text: "Food that feels special",
  },
] as const;

const storyStats = [
  {
    icon: faSmile,
    value: "10+",
    label: "Years of rolling happiness",
  },
  {
    icon: faHeart,
    value: "50K+",
    label: "Happy customers",
  },
  {
    icon: faPizzaSlice,
    value: "50+",
    label: "Menu combinations",
  },
  {
    icon: faLocationDot,
    value: "1",
    label: "Proudly serving Jodhpur",
  },
] as const;

const values = [
  {
    icon: faLeaf,
    title: "Fresh Ingredients",
    text: "We use fresh vegetables, quality cheese and carefully selected ingredients.",
  },
  {
    icon: faUtensils,
    title: "Authentic Recipes",
    text: "Every recipe is crafted to deliver bold, satisfying flavours.",
  },
  {
    icon: faPizzaSlice,
    title: "Made Fresh",
    text: "Pizzas, pastas and chur-chur naan are prepared fresh for every order.",
  },
  {
    icon: faHeart,
    title: "Made With Love",
    text: "We care about every plate, every order and every customer experience.",
  },
  {
    icon: faTruckFast,
    title: "Food Truck Experience",
    text: "Enjoy restaurant-quality food with the energy and charm of a food truck.",
  },
] as const;

const galleryItems = [
  "TRS food truck",
  "Signature pizza",
  "Chur-chur naan",
  "Fresh pasta",
  "Refreshing mocktails",
] as const;

export function AboutPage() {
  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[560px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:py-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              More Than Just Pizza
              <span className="h-px w-10 bg-[#E8A53A]" />
            </div>

            <h1 className="mt-6 max-w-[680px] break-words text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[.9] tracking-[-0.055em] text-[#14283B]">
              Our Story.
              <br />
              <span className="text-[#C8102E]">Our Passion.</span>
            </h1>

            <p className="mt-6 max-w-[620px] text-base leading-8 text-[#4F4943] sm:text-lg">
              The Rolling Stove is Jodhpur&apos;s vegetarian food truck serving
              fresh pizzas, pastas, chur-chur naan, fries, brownies and
              mocktails since 2016.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {heroHighlights.map(({ icon, title, text }) => (
                <article
                  key={title}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#EDE3D8] bg-white/90 p-4 shadow-[0_12px_30px_rgba(44,28,14,.06)]"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#E8A53A] bg-[#FFF8EE] text-[#C8102E]">
                    <FontAwesomeIcon icon={icon} className="h-4" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-[11px] font-black uppercase">
                      {title}
                    </strong>
                    <span className="mt-1 block text-[9px] leading-4 text-[#6D655E]">
                      {text}
                    </span>
                  </span>
                </article>
              ))}
            </div>
          </div>

          <div className="relative min-h-[360px] min-w-0 sm:min-h-[460px]">
            <CmsHeroMedia
              pageKey="about"
              label="TRS food truck hero image"
              className="absolute inset-0 rounded-[2rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)] shadow-[0_28px_70px_rgba(88,56,24,.14)]"
            />
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-8 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.15fr)_260px]">
          <MediaPlaceholder
            label="Our story image"
            className="min-h-[360px] rounded-3xl border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)] shadow-[0_20px_48px_rgba(50,30,15,.08)]"
          />

          <article className="min-w-0 py-2">
            <p className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
              <span className="h-px w-8 bg-[#E8A53A]" />
              Our Story
            </p>

            <h2 className="mt-4 max-w-[700px] text-[clamp(2rem,4vw,3.3rem)] font-black leading-[1.05] tracking-[-0.04em] text-[#172536]">
              From a Small Dream to Jodhpur&apos;s Favourite Food Truck
            </h2>

            <div className="mt-6 space-y-4 text-sm leading-7 text-[#4F4943]">
              <p>
                The Rolling Stove began with a simple idea: serve fresh,
                flavourful vegetarian food from a distinctive food truck and
                make every visit feel memorable.
              </p>

              <p>
                Since 2016, TRS has grown through consistency, creativity and
                the trust of customers across Jodhpur. Our menu brings together
                pizzas, pastas, chur-chur naan, garlic breads, fries, brownies
                and mocktails in one energetic food-truck experience.
              </p>

              <p>
                We continue to focus on quality ingredients, fresh preparation
                and warm service while keeping the informal, lively spirit that
                made TRS special from the beginning.
              </p>
            </div>
          </article>

          <aside className="min-w-0 divide-y divide-[#EDE3D8] rounded-3xl border border-[#EDE3D8] bg-white px-5 shadow-[0_16px_38px_rgba(50,30,15,.06)]">
            {storyStats.map(({ icon, value, label }) => (
              <div key={label} className="flex min-w-0 items-center gap-4 py-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#FFF4E7] text-[#D99219]">
                  <FontAwesomeIcon icon={icon} className="h-5" />
                </span>
                <div className="min-w-0">
                  <strong className="block text-2xl font-black text-[#C8102E]">
                    {value}
                  </strong>
                  <span className="mt-1 block text-[10px] font-semibold leading-4 text-[#5E5751]">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto w-[min(100%-2rem,1240px)] min-w-0">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-16 bg-[#E8A53A]" />
            <h2 className="text-center text-xl font-black uppercase tracking-[-0.03em] sm:text-2xl">
              What Makes Us <span className="text-[#C8102E]">Special</span>
            </h2>
            <span className="h-px w-16 bg-[#E8A53A]" />
          </div>

          <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {values.map(({ icon, title, text }) => (
              <article
                key={title}
                className="min-w-0 rounded-3xl border border-[#EDE3D8] bg-white p-6 text-center shadow-[0_14px_32px_rgba(50,30,15,.05)] transition hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(50,30,15,.09)]"
              >
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FFF4E7] text-[#C8102E]">
                  <FontAwesomeIcon icon={icon} className="h-6" />
                </span>

                <h3 className="mt-5 text-xs font-black uppercase">{title}</h3>
                <p className="mt-3 text-[11px] leading-5 text-[#655E57]">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto w-[min(100%-2rem,1240px)] min-w-0">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-16 bg-[#E8A53A]" />
            <h2 className="text-center text-xl font-black uppercase tracking-[-0.03em] sm:text-2xl">
              A Glimpse of TRS
            </h2>
            <span className="h-px w-16 bg-[#E8A53A]" />
          </div>

          <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {galleryItems.map((label, index) => (
              <MediaPlaceholder
                key={label}
                label={label}
                className={`min-h-[220px] rounded-3xl border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)] ${
                  index === 0 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 overflow-hidden rounded-3xl border border-[#8C1016] bg-[linear-gradient(135deg,#B10008,#7E0007)] text-white shadow-[0_22px_50px_rgba(132,0,8,.2)] lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)]">
          <MediaPlaceholder
            label="TRS favourites image"
            className="min-h-[260px] rounded-none border-0 bg-white/10"
          />

          <div className="flex min-w-0 flex-col justify-center p-7 sm:p-10">
            <p className="text-xl font-black italic text-[#FFD24D]">
              Good Food. Good Mood.
            </p>

            <h2 className="mt-3 text-[clamp(2.4rem,6vw,4.8rem)] font-black uppercase leading-[.92] tracking-[-0.05em]">
              Let&apos;s Roll!
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/80">
              Visit TRS at Shastri Circle or order online and enjoy the food
              truck experience Jodhpur loves.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/menu"
                className="inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-[#FFD24D] px-6 text-[11px] font-black uppercase text-[#2B2307] transition hover:-translate-y-0.5"
              >
                Order Now
                <FontAwesomeIcon icon={faArrowRight} className="h-3" />
              </Link>

              <a
                href="https://maps.app.goo.gl/uBCTJ5VkTXGJUgLg7"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-3 rounded-xl border border-white/35 px-6 text-[11px] font-black uppercase text-white transition hover:bg-white hover:text-[#8F080E]"
              >
                Visit Us
                <FontAwesomeIcon icon={faLocationDot} className="h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
