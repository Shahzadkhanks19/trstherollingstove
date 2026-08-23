import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faFacebookF,
  faInstagram,
  faWhatsapp,
} from "@fortawesome/free-brands-svg-icons";
import {
  faArrowRight,
  faClock,
  faEnvelope,
  faLocationDot,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";

const quickLinks = [
  ["/", "Home"],
  ["/menu", "Menu"],
  ["/offers", "Offers"],
  ["/rewards", "Rewards"],
  ["/track-order", "Track Order"],
  ["/about", "About"],
  ["/contact", "Contact"],
] as const;

const usefulLinks = [
  ["/gallery", "Gallery"],
  ["/faq", "FAQ"],
  ["/careers", "Careers"],
  ["/login", "Login"],
  ["/signup", "Register"],
] as const;

interface SocialLink {
  icon: IconDefinition;
  label: string;
  href: string;
}

const socialLinks: SocialLink[] = [
  {
    icon: faInstagram,
    label: "Instagram",
    href: "https://www.instagram.com/trstherolling?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    icon: faFacebookF,
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61551432983788",
  },
  {
    icon: faWhatsapp,
    label: "WhatsApp",
    href: "https://wa.me/919166694786",
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0F1720] text-white">
      <div className="mx-auto grid w-[min(100%-2rem,1280px)] gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.2fr_.7fr_.7fr_1fr]">
        <div className="lg:pr-8">
          <div className="flex items-start gap-4">
            <span className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full bg-white p-1 shadow-lg">
              <Image
                src="/images/trs-logo.png"
                alt="The Rolling Stove"
                width={76}
                height={76}
                unoptimized
                className="h-full w-full object-contain"
              />
            </span>

            <div>
              <p className="text-sm font-black">
                TRS – The Rolling Stove Pizzeria
              </p>

              <p className="mt-2 max-w-[300px] text-[11px] leading-5 text-white/70">
                Jodhpur&apos;s favourite vegetarian food truck serving hot,
                fresh and delicious comfort food since 2016.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit The Rolling Stove on ${label}`}
                className="grid h-10 w-10 place-items-center rounded-full border border-[#E8A53A]/55 text-[#E8A53A] transition hover:-translate-y-0.5 hover:border-[#E8A53A] hover:bg-[#E8A53A] hover:text-[#0F1720] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A53A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1720]"
              >
                <FontAwesomeIcon icon={icon} className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="border-white/10 lg:border-l lg:pl-8">
          <h3 className="text-xs font-black uppercase tracking-wide text-[#E8A53A]">
            Quick Links
          </h3>

          <div className="mt-4 grid gap-2.5 text-[11px] text-white/75">
            {quickLinks.map(([href, label]) => (
              <Link
                key={`${href}-${label}`}
                href={href}
                className="w-fit transition hover:text-[#E8A53A]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-white/10 lg:border-l lg:pl-8">
          <h3 className="text-xs font-black uppercase tracking-wide text-[#E8A53A]">
            More
          </h3>

          <div className="mt-4 grid gap-2.5 text-[11px] text-white/75">
            {usefulLinks.map(([href, label]) => (
              <Link
                key={`${href}-${label}`}
                href={href}
                className="w-fit transition hover:text-[#E8A53A]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-white/10 lg:border-l lg:pl-8">
          <h3 className="text-xs font-black uppercase tracking-wide text-[#E8A53A]">
            Contact Us
          </h3>

          <div className="mt-4 grid gap-3 text-[11px] leading-5 text-white/75">
            <span className="flex gap-3">
              <FontAwesomeIcon
                icon={faPhone}
                className="mt-1 h-3 w-3 shrink-0 text-[#E8A53A]"
              />

              <a
                href="tel:+919166694786"
                className="transition hover:text-[#E8A53A]"
              >
                +91 91666 94786
              </a>
            </span>

            <span className="flex gap-3">
              <FontAwesomeIcon
                icon={faEnvelope}
                className="mt-1 h-3 w-3 shrink-0 text-[#E8A53A]"
              />

              <a
                href="mailto:hello@therollingstove.in"
                className="break-all transition hover:text-[#E8A53A]"
              >
                hello@therollingstove.in
              </a>
            </span>

            <span className="flex gap-3">
              <FontAwesomeIcon
                icon={faLocationDot}
                className="mt-1 h-3 w-3 shrink-0 text-[#E8A53A]"
              />

              <a
                href="https://maps.app.goo.gl/uBCTJ5VkTXGJUgLg7"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-[#E8A53A]"
              >
                Shastri Circle, Sector-H, Jodhpur, Rajasthan 342003
              </a>
            </span>

            <span className="flex gap-3">
              <FontAwesomeIcon
                icon={faClock}
                className="mt-1 h-3 w-3 shrink-0 text-[#E8A53A]"
              />

              <span>Daily: 5:30 PM – 11:30 PM</span>
            </span>
          </div>

          <Link
            href="/menu"
            className="mt-5 inline-flex h-10 items-center gap-3 rounded-lg bg-[#C8102E] px-5 text-[10px] font-black uppercase text-white shadow-[0_10px_24px_rgba(200,16,46,.25)] transition hover:-translate-y-0.5 hover:bg-[#A50E27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A53A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1720]"
          >
            Order Now
            <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-[min(100%-2rem,1280px)] flex-col gap-3 py-4 text-[9px] text-white/55 md:flex-row md:items-center md:justify-between">
          <span>
            © {new Date().getFullYear()} The Rolling Stove Pizzeria. All
            rights reserved.
          </span>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>

            <Link href="/terms" className="transition hover:text-white">
              Terms &amp; Conditions
            </Link>

            <Link
              href="/refund-policy"
              className="transition hover:text-white"
            >
              Refund Policy
            </Link>
          </div>

          <a
            href="https://wa.me/917014854192"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#E8A53A] transition hover:text-white"
          >
            Designed &amp; Developed by Shahzad Khan
          </a>
        </div>
      </div>
    </footer>
  );
}
