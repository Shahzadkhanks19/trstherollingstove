"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

export type GoogleReview = {
  name: string;
  initials: string;
  time: string;
  review: string;
  rating?: number;
};

type GoogleReviewsProps = {
  reviews?: readonly GoogleReview[];
  title?: string;
  eyebrow?: string;
  rating?: number;
  reviewCountLabel?: string;
  viewAllHref?: string;
  compact?: boolean;
  className?: string;
};

export const DEFAULT_GOOGLE_REVIEWS: readonly GoogleReview[] = [
  {
    name: "Aman Sharma",
    initials: "AS",
    time: "2 months ago",
    review:
      "The cheese burst pizza is absolutely amazing. One of the best food-truck experiences in Jodhpur.",
    rating: 5,
  },
  {
    name: "Riya Singh",
    initials: "RS",
    time: "3 months ago",
    review:
      "Chur-chur naan is a must try—soft, buttery and full of flavour.",
    rating: 5,
  },
  {
    name: "Kunal Rathore",
    initials: "KR",
    time: "4 months ago",
    review:
      "Great taste, quick service and friendly staff. Highly recommended.",
    rating: 5,
  },
  {
    name: "Neha Jain",
    initials: "NJ",
    time: "5 months ago",
    review:
      "Loved the pasta and garlic bread. A good place to enjoy food with family and friends.",
    rating: 5,
  },
] as const;

export function GoogleIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5Z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.1 0 9.8-2 13.3-5.2l-6.1-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.4 39.5 16.1 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.1 5.2C36.9 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5Z"
      />
    </svg>
  );
}

function StarRating({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <span
      className="flex items-center gap-0.5 text-[13px] text-[#FBBC04]"
      aria-label={`${safeRating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true">
          {index < safeRating ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

export function GoogleReviews({
  reviews = DEFAULT_GOOGLE_REVIEWS,
  title = "What Our Customers Say",
  eyebrow = "Customer feedback",
  rating = 4.8,
  reviewCountLabel = "Based on Google reviews",
  viewAllHref = "https://maps.app.goo.gl/uBCTJ5VkTXGJUgLg7",
  compact = false,
  className = "",
}: GoogleReviewsProps) {
  return (
    <section
      className={`rounded-[22px] border border-[#E6E6E6] bg-white p-5 shadow-[0_12px_38px_rgba(32,33,36,.07)] sm:p-7 ${className}`}
    >
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C8102E]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-[20px] font-black uppercase tracking-[-0.035em] text-[#28231F] sm:text-[24px]">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_5px_18px_rgba(60,64,67,.10)]">
          <GoogleIcon className="h-7 w-7 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#202124]">{rating}</span>
              <StarRating rating={rating} />
            </div>
            <p className="text-[10px] font-medium text-[#5F6368]">
              {reviewCountLabel}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`mt-6 grid gap-4 sm:grid-cols-2 ${
          compact ? "xl:grid-cols-4" : "lg:grid-cols-4"
        }`}
      >
        {reviews.map(({ name, initials, time, review, rating: itemRating = 5 }, index) => (
          <article
            key={`${name}-${time}`}
            className="group flex min-h-[220px] min-w-0 flex-col rounded-[16px] border border-[#E5E7EB] bg-white p-4 shadow-[0_2px_8px_rgba(60,64,67,.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(60,64,67,.14)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
                    index % 4 === 0
                      ? "bg-[#4285F4]"
                      : index % 4 === 1
                        ? "bg-[#34A853]"
                        : index % 4 === 2
                          ? "bg-[#EA4335]"
                          : "bg-[#F9AB00]"
                  }`}
                >
                  {initials}
                </span>

                <div className="min-w-0">
                  <h3 className="truncate text-[11px] font-bold text-[#202124]">
                    {name}
                  </h3>
                  <p className="mt-0.5 text-[9px] text-[#70757A]">{time}</p>
                </div>
              </div>

              <GoogleIcon className="h-5 w-5 shrink-0" />
            </div>

            <div className="mt-4">
              <StarRating rating={itemRating} />
            </div>

            <p className="mt-3 line-clamp-5 text-[10px] font-medium leading-5 text-[#3C4043]">
              {review}
            </p>

            <div className="mt-auto pt-4 text-[9px] font-medium text-[#70757A]">
              Posted on Google
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 text-center">
        <a
          href={viewAllHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-3 rounded-full border border-[#DADCE0] bg-white px-6 text-[9px] font-black uppercase tracking-[0.05em] text-[#3C4043] shadow-sm transition hover:-translate-y-0.5 hover:border-[#4285F4] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]"
        >
          <GoogleIcon className="h-4 w-4" />
          View All Reviews on Google
          <FontAwesomeIcon
            icon={faArrowRight}
            className="h-3 text-[#4285F4]"
          />
        </a>
      </div>
    </section>
  );
}
