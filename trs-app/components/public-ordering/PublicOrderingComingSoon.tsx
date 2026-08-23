import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faEnvelope,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

export function PublicOrderingComingSoon({
  message,
}: {
  message: string;
}) {
  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top,#fff5ec_0%,#fff_45%,#f8f4f1_100%)] px-4 py-16 sm:px-6 sm:py-24">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[32px] border border-[#eadfd7] bg-white shadow-2xl shadow-[#173044]/10">
        <div className="h-2 bg-gradient-to-r from-[#C8102E] via-[#E8A53A] to-[#173044]" />
        <div className="p-6 text-center sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#fff0e8] text-2xl text-[#C8102E]">
            <FontAwesomeIcon icon={faClock} />
          </span>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[.24em] text-[#C8102E]">
            Public preview
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] text-[#173044] sm:text-5xl">
            Online Ordering Coming Soon
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#6f655e] sm:text-base">
            {message}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/menu"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#173044] px-5 text-xs font-black uppercase tracking-[.08em] text-white transition hover:bg-[#24465f]"
            >
              <FontAwesomeIcon icon={faUtensils} />
              Browse Menu
            </Link>
            <Link
              href="/contact"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-5 text-xs font-black uppercase tracking-[.08em] text-white transition hover:bg-[#a90d27]"
            >
              <FontAwesomeIcon icon={faEnvelope} />
              Contact Us
            </Link>
          </div>
          <p className="mt-6 text-xs font-semibold leading-5 text-[#8b8078]">
            The contact form remains available for enquiries, feedback and complaints.
          </p>
        </div>
      </section>
    </main>
  );
}
