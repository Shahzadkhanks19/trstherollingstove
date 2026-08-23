import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faCoins,
  faHeart,
  faTags,
} from "@fortawesome/free-solid-svg-icons";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";

type Benefit = {
  icon: IconDefinition;
  title: string;
  text: string;
};

const benefits: Benefit[] = [
  {
    icon: faCoins,
    title: "Earn TRS Coins",
    text: "Earn 5 TRS Coins for every eligible ₹100 spent.",
  },
  {
    icon: faTags,
    title: "Exclusive Offers",
    text: "Access member-only deals and selected promotions.",
  },
  {
    icon: faBolt,
    title: "Faster Checkout",
    text: "Save your details for a quicker ordering experience.",
  },
  {
    icon: faHeart,
    title: "Personalised for You",
    text: "Receive recommendations based on your favourites.",
  },
];

export function AuthBenefitsPanel() {
  return (
    <aside className="relative min-w-0 overflow-hidden bg-[linear-gradient(135deg,#FFF8ED,#FFF1E2)] p-6 sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative z-10">
        <p className="text-center text-lg font-black italic text-[#C8102E]">
          More Than Just Pizza,
        </p>
        <h2 className="mt-2 text-center text-2xl font-black uppercase tracking-[-0.04em] text-[#172536] sm:text-3xl">
          It&apos;s an Experience!
        </h2>

        <div className="mx-auto mt-4 flex items-center justify-center gap-3">
          <span className="h-px w-16 bg-[#E8A53A]" />
          <span className="text-[#E8A53A]">★</span>
          <span className="h-px w-16 bg-[#E8A53A]" />
        </div>

        <div className="mt-8 grid gap-5">
          {benefits.map(({ icon, title, text }) => (
            <article key={title} className="flex min-w-0 items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#E8A53A] bg-white/80 text-[#D99219]">
                <FontAwesomeIcon icon={icon} className="h-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-black">{title}</h3>
                <p className="mt-1 text-[11px] leading-5 text-[#5E5751]">{text}</p>
              </div>
            </article>
          ))}
        </div>

        <MediaPlaceholder
          label="TRS login experience image"
          className="mt-8 min-h-[260px] rounded-3xl border-[#E8D8C9] bg-white/40"
        />
      </div>
    </aside>
  );
}
