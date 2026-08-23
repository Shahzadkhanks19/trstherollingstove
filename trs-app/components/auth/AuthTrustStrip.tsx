import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faLeaf,
  faShieldHeart,
  faStore,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

type TrustItem = {
  icon: IconDefinition;
  title: string;
  text: string;
};

const trustItems: TrustItem[] = [
  {
    icon: faLeaf,
    title: "100% Vegetarian",
    text: "Pure vegetarian menu",
  },
  {
    icon: faUtensils,
    title: "Fresh Ingredients",
    text: "Prepared with care",
  },
  {
    icon: faShieldHeart,
    title: "Secure Payments",
    text: "Protected checkout",
  },
  {
    icon: faStore,
    title: "Dine-in or Takeaway",
    text: "Choose your order type",
  },
  {
    icon: faClock,
    title: "Trusted Since 2016",
    text: "Serving Jodhpur",
  },
];

export function AuthTrustStrip() {
  return (
    <section className="border-y border-[#EDE3D8] bg-white">
      <div className="mx-auto grid w-[min(100%-2rem,1240px)] gap-px overflow-hidden bg-[#EDE3D8] sm:grid-cols-2 lg:grid-cols-5">
        {trustItems.map(({ icon, title, text }) => (
          <article
            key={title}
            className="flex min-w-0 items-center gap-3 bg-white p-5"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#D99219]">
              <FontAwesomeIcon icon={icon} className="h-5" />
            </span>
            <span className="min-w-0">
              <strong className="block text-[9px] font-black uppercase">
                {title}
              </strong>
              <span className="mt-1 block text-[8px] text-[#655E57]">{text}</span>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
