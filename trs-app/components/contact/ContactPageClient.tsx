"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { FormEvent } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faClock,
  faEnvelope,
  faHeart,
  faLocationDot,
  faPaperPlane,
  faPhone,
  faShieldHeart,
  faSmile,
  faTruckFast,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import {
  faFacebookF,
  faInstagram,
  faWhatsapp,
} from "@fortawesome/free-brands-svg-icons";
import { useState } from "react";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";

type ContactMethod = {
  icon: IconDefinition;
  title: string;
  text: string;
};

type SocialCard = {
  icon: IconDefinition;
  name: string;
  description: string;
  action: string;
  href: string;
  brandClass: string;
};

type ContactFormState = {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
};

const heroHighlights: ContactMethod[] = [
  {
    icon: faClock,
    title: "Quick Response",
    text: "We respond as soon as possible",
  },
  {
    icon: faHeart,
    title: "Made With Care",
    text: "Helpful customer support",
  },
  {
    icon: faPhone,
    title: "Easy To Connect",
    text: "Call, WhatsApp or message us",
  },
  {
    icon: faSmile,
    title: "Happy To Help",
    text: "Your experience matters to us",
  },
];

const socialCards: SocialCard[] = [
  {
    icon: faWhatsapp,
    name: "WhatsApp",
    description: "Chat with us instantly",
    action: "Chat Now",
    href: "https://wa.me/919166694786",
    brandClass: "text-[#25D366]",
  },
  {
    icon: faInstagram,
    name: "Instagram",
    description: "Follow us for updates",
    action: "Follow Us",
    href: "https://www.instagram.com/trstherolling?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    brandClass: "text-[#E4405F]",
  },
  {
    icon: faFacebookF,
    name: "Facebook",
    description: "Like and stay connected",
    action: "Visit Page",
    href: "https://www.facebook.com/profile.php?id=61551432983788",
    brandClass: "text-[#1877F2]",
  },
  {
    icon: faPhone,
    name: "Call Us",
    description: "Speak to the TRS team",
    action: "Call Now",
    href: "tel:+919166694786",
    brandClass: "text-[#C8102E]",
  },
];

const trustItems: ContactMethod[] = [
  {
    icon: faTruckFast,
    title: "Dine-in or Takeaway",
    text: "Order your way",
  },
  {
    icon: faUtensils,
    title: "Fresh Ingredients",
    text: "Prepared with care",
  },
  {
    icon: faShieldHeart,
    title: "Hygienic Kitchen",
    text: "Clean and safe",
  },
  {
    icon: faHeart,
    title: "Made With Love",
    text: "Always for you",
  },
];

const initialFormState: ContactFormState = {
  name: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactPageClient() {
  const [form, setForm] = useState<ContactFormState>(initialFormState);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const updateField = (
    field: keyof ContactFormState,
    value: string,
  ): void => {
    setForm((current) => ({ ...current, [field]: value }));

    if (status !== "idle") {
      setStatus("idle");
      setStatusMessage("");
    }
  };

  const validateForm = (): string | null => {
    if (form.name.trim().length < 2) {
      return "Please enter your full name.";
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!form.subject) {
      return "Please select a subject.";
    }

    if (form.message.trim().length < 10) {
      return "Please enter a message of at least 10 characters.";
    }

    return null;
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setStatus("error");
      setStatusMessage(validationError);
      return;
    }

    setStatus("submitting");
    setStatusMessage("");

    try {
      const response = await fetch("/api/v1/public/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          subject: form.subject,
          message: form.message.trim(),
          source: "contact-page",
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to submit contact form");
      }

      setForm(initialFormState);
      setStatus("success");
      setStatusMessage(
        "Thank you. Your message has been sent successfully.",
      );
    } catch {
      setStatus("error");
      setStatusMessage(
        "We could not send your message right now. Please contact us on WhatsApp or phone.",
      );
    }
  };

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[540px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:py-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              We&apos;d Love to Hear From You
              <span className="h-px w-10 bg-[#E8A53A]" />
            </div>

            <h1 className="mt-6 max-w-[680px] break-words text-[clamp(3.2rem,8vw,6.2rem)] font-black uppercase leading-[.88] tracking-[-0.055em] text-[#14283B]">
              Let&apos;s Get In
              <br />
              <span className="text-[#C8102E]">Touch!</span>
            </h1>

            <p className="mt-6 max-w-[620px] text-base leading-8 text-[#4F4943] sm:text-lg">
              Have a question, suggestion or feedback? The TRS team is here to
              help. Reach out by phone, WhatsApp, social media or the form
              below.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {heroHighlights.map(({ icon, title, text }) => (
                <article
                  key={title}
                  className="min-w-0 rounded-2xl border border-[#EDE3D8] bg-white/90 p-4 text-center shadow-[0_12px_30px_rgba(44,28,14,.06)]"
                >
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-[#E8A53A] bg-[#FFF8EE] text-[#C8102E]">
                    <FontAwesomeIcon icon={icon} className="h-4" />
                  </span>
                  <strong className="mt-3 block text-[9px] font-black uppercase">
                    {title}
                  </strong>
                  <span className="mt-1 block text-[8px] leading-4 text-[#6D655E]">
                    {text}
                  </span>
                </article>
              ))}
            </div>
          </div>

          <div className="relative min-h-[340px] min-w-0 sm:min-h-[450px]">
            <CmsHeroMedia
              pageKey="contact"
              label="TRS contact hero image"
              className="absolute inset-0 rounded-[2rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)] shadow-[0_28px_70px_rgba(88,56,24,.14)]"
            />
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 overflow-hidden rounded-3xl border border-[#EDE3D8] bg-white shadow-[0_20px_48px_rgba(50,30,15,.08)] lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-w-0 border-b border-[#EDE3D8] p-6 lg:border-b-0 lg:border-r sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#C8102E]">
                <FontAwesomeIcon icon={faLocationDot} className="h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black uppercase">Our Location</h2>
                <p className="mt-1 text-xs text-[#655E57]">Jodhpur, Rajasthan</p>
              </div>
            </div>

            <div className="mt-7 space-y-5 border-t border-[#EDE3D8] pt-6 text-sm">
              <div className="flex gap-3">
                <FontAwesomeIcon
                  icon={faLocationDot}
                  className="mt-1 h-4 shrink-0 text-[#C8102E]"
                />
                <div>
                  <strong className="block text-sm">
                    The Rolling Stove Pizzeria
                  </strong>
                  <p className="mt-1 text-xs leading-6 text-[#5E5751]">
                    Shastri Circle, Sector-H,
                    <br />
                    Jodhpur, Rajasthan 342003
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <FontAwesomeIcon
                  icon={faPhone}
                  className="mt-1 h-4 shrink-0 text-[#C8102E]"
                />
                <div className="grid gap-1 text-xs font-semibold">
                  <a
                    href="tel:+919166694786"
                    className="transition hover:text-[#C8102E]"
                  >
                    +91 91666 94786
                  </a>
                  <a
                    href="tel:+917300052777"
                    className="transition hover:text-[#C8102E]"
                  >
                    +91 73000 52777
                  </a>
                </div>
              </div>

              <div className="flex gap-3">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="mt-1 h-4 shrink-0 text-[#C8102E]"
                />
                <a
                  href="mailto:hello@therollingstove.in"
                  className="break-all text-xs font-semibold transition hover:text-[#C8102E]"
                >
                  hello@therollingstove.in
                </a>
              </div>

              <div className="flex gap-3">
                <FontAwesomeIcon
                  icon={faClock}
                  className="mt-1 h-4 shrink-0 text-[#C8102E]"
                />
                <p className="text-xs font-semibold">
                  Daily: 5:30 PM – 11:30 PM
                </p>
              </div>
            </div>

            <a
              href="https://maps.app.goo.gl/uBCTJ5VkTXGJUgLg7"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#C8102E] text-[10px] font-black uppercase text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white"
            >
              Get Directions
              <FontAwesomeIcon icon={faArrowRight} className="h-3" />
            </a>
          </aside>

          <div className="relative min-h-[420px] min-w-0 bg-[#F7F1E9]">
            <iframe
              title="The Rolling Stove location map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3577.9938937097777!2d73.00198177466308!3d26.261861587758897!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39418c22aec4201b%3A0x235125434f8b9a2d!2sTRS%3A%20The%20Rolling%20Stove!5e0!3m2!1sen!2sin!4v1784809918109!5m2!1sen!2sin"
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <section className="min-w-0 rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#C8102E]">
                <FontAwesomeIcon icon={faEnvelope} className="h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black uppercase">
                  Send Us a Message
                </h2>
                <p className="mt-1 text-[10px] text-[#655E57]">
                  Fill out the form and our team will respond shortly.
                </p>
              </div>
            </div>

            <form onSubmit={submitForm} className="mt-7">
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="min-w-0 text-[10px] font-black">
                  Your Name <span className="text-[#C8102E]">*</span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your name"
                    className="mt-2 h-12 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                  />
                </label>

                <label className="min-w-0 text-[10px] font-black">
                  Phone Number <span className="text-[#C8102E]">*</span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="Enter your mobile number"
                    className="mt-2 h-12 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                  />
                </label>

                <label className="min-w-0 text-[10px] font-black">
                  Email Address <span className="text-[#C8102E]">*</span>
                  <input
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    className="mt-2 h-12 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                  />
                </label>

                <label className="min-w-0 text-[10px] font-black">
                  Subject <span className="text-[#C8102E]">*</span>
                  <select
                    value={form.subject}
                    onChange={(event) =>
                      updateField("subject", event.target.value)
                    }
                    className="mt-2 h-12 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium outline-none transition focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General enquiry</option>
                    <option value="order">Order support</option>
                    <option value="reservation">Reservation</option>
                    <option value="feedback">Feedback or suggestion</option>
                    <option value="career">Career enquiry</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 block text-[10px] font-black">
                Message <span className="text-[#C8102E]">*</span>
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    updateField("message", event.target.value)
                  }
                  rows={6}
                  placeholder="Type your message here..."
                  className="mt-2 w-full resize-y rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-[#9C938A] focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10"
                />
              </label>

              {statusMessage && (
                <div
                  role={status === "error" ? "alert" : "status"}
                  className={`mt-4 rounded-xl border px-4 py-3 text-xs font-semibold ${
                    status === "success"
                      ? "border-[#B8DFC0] bg-[#F1FBF3] text-[#287238]"
                      : "border-[#F1C6C6] bg-[#FFF3F3] text-[#A50E27]"
                  }`}
                >
                  {statusMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white shadow-[0_12px_28px_rgba(200,16,46,.22)] transition hover:-translate-y-0.5 hover:bg-[#A50E27] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {status === "submitting" ? "Sending..." : "Send Message"}
                <FontAwesomeIcon icon={faPaperPlane} className="h-3" />
              </button>
            </form>
          </section>

          <section className="min-w-0 rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#C8102E]">
                <FontAwesomeIcon icon={faPhone} className="h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black uppercase">
                  Connect With Us
                </h2>
                <p className="mt-1 text-[10px] text-[#655E57]">
                  Reach out through your preferred platform.
                </p>
              </div>
            </div>

            <div className="mt-7 grid min-w-0 grid-cols-2 gap-3">
              {socialCards.map(
                ({ icon, name, description, action, href, brandClass }) => (
                  <a
                    key={name}
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="group min-w-0 rounded-2xl border border-[#EDE3D8] bg-[#FFFDF9] p-4 text-center transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(50,30,15,.09)]"
                  >
                    <FontAwesomeIcon
                      icon={icon}
                      className={`h-8 ${brandClass}`}
                    />
                    <strong className="mt-3 block text-[10px] font-black uppercase">
                      {name}
                    </strong>
                    <span className="mt-1 block text-[8px] leading-4 text-[#655E57]">
                      {description}
                    </span>
                    <span className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4D7CA] bg-white px-3 text-[8px] font-black uppercase text-[#292520] transition group-hover:border-[#C8102E] group-hover:text-[#C8102E]">
                      {action}
                      <FontAwesomeIcon icon={faArrowRight} className="h-2.5" />
                    </span>
                  </a>
                ),
              )}
            </div>

            <div className="mt-5 grid min-w-0 items-center gap-5 rounded-2xl border border-[#F0DFC8] bg-[#FFF7EA] p-5 sm:grid-cols-[minmax(0,1fr)_150px]">
              <div className="min-w-0">
                <h3 className="text-lg font-black uppercase">
                  Have a Suggestion?
                </h3>
                <p className="mt-2 text-xs leading-5 text-[#625B55]">
                  Share your feedback and help us improve the TRS experience.
                </p>
                <a
                  href="https://wa.me/919166694786?text=Hi%20TRS%2C%20I%20have%20a%20suggestion%20to%20share."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex h-10 items-center gap-3 rounded-xl border border-[#C8102E] px-4 text-[9px] font-black uppercase text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white"
                >
                  Share Feedback
                  <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                </a>
              </div>

              <MediaPlaceholder
                label="Suggestion box image"
                className="aspect-square w-full rounded-2xl bg-[#FFF1E5]"
              />
            </div>
          </section>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-px overflow-hidden rounded-2xl border border-[#EDE3D8] bg-[#EDE3D8] shadow-[0_14px_32px_rgba(50,30,15,.05)] sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map(({ icon, title, text }) => (
            <article
              key={title}
              className="flex min-w-0 items-center gap-3 bg-white p-5"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#D99219]">
                <FontAwesomeIcon icon={icon} className="h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[10px] font-black uppercase">{title}</h2>
                <p className="mt-1 text-[9px] leading-4 text-[#655E57]">
                  {text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
