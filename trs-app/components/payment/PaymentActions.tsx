import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faHeadset,
  faRotateRight,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export type PaymentStage =
  | "loading"
  | "ready"
  | "opening"
  | "cancelled"
  | "failed"
  | "verifying"
  | "unknown"
  | "invalid";

type PaymentActionsProps = {
  stage: PaymentStage;
  onOpenCheckout: () => void;
  onCheckStatus: () => void;
  onPrepare: () => void;
};

export function PaymentActions({
  stage,
  onOpenCheckout,
  onCheckStatus,
  onPrepare,
}: PaymentActionsProps) {
  return (
    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
      {(stage === "ready" ||
        stage === "cancelled" ||
        stage === "failed") && (
        <button
          type="button"
          onClick={onOpenCheckout}
          className="min-h-12 rounded-xl bg-[#C91F32] px-6 text-xs font-black uppercase tracking-wider text-white shadow-[0_12px_24px_rgba(201,31,50,0.18)] outline-none transition hover:bg-[#AE1728] focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2"
        >
          {stage === "ready"
            ? "Open Payment Window"
            : stage === "cancelled"
              ? "Resume Payment"
              : "Retry Payment"}
        </button>
      )}

      {stage === "failed" && (
        <button
          type="button"
          onClick={onOpenCheckout}
          className="min-h-12 rounded-xl border border-[#C99A2E] bg-[#FFF8E8] px-6 text-xs font-black uppercase tracking-wider text-[#8F6512] transition hover:bg-[#FFF1CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99A2E] focus-visible:ring-offset-2"
        >
          <FontAwesomeIcon icon={faWallet} className="mr-2 h-3" />
          Different Payment Method
        </button>
      )}

      {stage === "unknown" && (
        <button
          type="button"
          onClick={onCheckStatus}
          className="min-h-12 rounded-xl bg-[#C91F32] px-6 text-xs font-black uppercase tracking-wider text-white shadow-[0_12px_24px_rgba(201,31,50,0.18)] outline-none transition hover:bg-[#AE1728] focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2"
        >
          Check Payment Status
        </button>
      )}

      {(stage === "failed" || stage === "invalid") && (
        <Link
          href="/checkout"
          className="grid min-h-12 place-items-center rounded-xl border border-[#C91F32] bg-white px-6 text-xs font-black uppercase tracking-wider text-[#B7192C] transition hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2"
        >
          <span>
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-3" />
            Return to Checkout
          </span>
        </Link>
      )}

      {stage === "cancelled" && (
        <Link
          href="/cart"
          className="grid min-h-12 place-items-center rounded-xl border border-[#C91F32] bg-white px-6 text-xs font-black uppercase tracking-wider text-[#B7192C] transition hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2"
        >
          <span>
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-3" />
            Return to Cart
          </span>
        </Link>
      )}

      {stage === "failed" && (
        <Link
          href="/contact"
          className="grid min-h-12 place-items-center rounded-xl border border-[#D8CDBB] bg-white px-6 text-xs font-black uppercase tracking-wider text-[#51483D] transition hover:bg-[#FFF9EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99A2E] focus-visible:ring-offset-2"
        >
          <span>
            <FontAwesomeIcon
              icon={faHeadset}
              className="mr-2 h-3 text-[#B7192C]"
            />
            Contact Support
          </span>
        </Link>
      )}

      {stage === "invalid" && (
        <button
          type="button"
          onClick={onPrepare}
          className="min-h-12 rounded-xl bg-[#C91F32] px-6 text-xs font-black uppercase tracking-wider text-white shadow-[0_12px_24px_rgba(201,31,50,0.18)] outline-none transition hover:bg-[#AE1728] focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2"
        >
          <FontAwesomeIcon icon={faRotateRight} className="mr-2 h-3" />
          Try Again
        </button>
      )}
    </div>
  );
}
