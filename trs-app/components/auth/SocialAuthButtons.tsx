"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFacebookF,
  faWhatsapp,
} from "@fortawesome/free-brands-svg-icons";
import { GoogleIcon } from "@/components/site/GoogleReviews";

type SocialAuthButtonsProps = {
  mode: "login" | "signup";
};

export function SocialAuthButtons({ mode }: SocialAuthButtonsProps) {
  const label = mode === "login" ? "Continue with" : "Sign up with";

  return (
    <div className="mt-6">
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-[#E5D9CD]" />
        <span className="rounded-full border border-[#E5D9CD] bg-white px-3 py-2 text-[9px] font-black uppercase text-[#655E57]">
          Or
        </span>
        <span className="h-px flex-1 bg-[#E5D9CD]" />
      </div>

      <p className="mt-4 text-center text-[10px] font-semibold text-[#655E57]">
        {label}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <a
          href="/api/v1/auth/google"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5D9CD] bg-white text-[10px] font-black transition hover:border-[#4285F4]"
        >
          <GoogleIcon className="h-4 w-4" />
          Google
        </a>

        <a
          href="/api/v1/auth/facebook"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5D9CD] bg-white text-[10px] font-black transition hover:border-[#1877F2] hover:text-[#1877F2]"
        >
          <FontAwesomeIcon icon={faFacebookF} className="h-4 text-[#1877F2]" />
          Facebook
        </a>

        <a
          href="/api/v1/auth/whatsapp"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5D9CD] bg-white text-[10px] font-black transition hover:border-[#25D366] hover:text-[#1D7A3A]"
        >
          <FontAwesomeIcon icon={faWhatsapp} className="h-4 text-[#25D366]" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
