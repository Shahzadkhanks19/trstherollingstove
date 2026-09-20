import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCircleExclamation,
  faCreditCard,
  faLock,
  faShieldHalved,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import { PaymentActions, type PaymentStage } from "@/components/payment/PaymentActions";
import { PaymentProgress } from "@/components/payment/PaymentProgress";

type PaymentStatusPanelProps = {
  stage: PaymentStage;
  message: string;
  onOpenCheckout: () => void;
  onCheckStatus: () => void;
  onPrepare: () => void;
};

function paymentTitle(stage: PaymentStage) {
  if (stage === "cancelled") return "Payment Cancelled";
  if (stage === "failed") return "Payment Failed";
  if (stage === "unknown" || stage === "verifying") return "Confirming Payment";
  if (stage === "invalid") return "Payment Session Not Found";
  return ["loading", "opening"].includes(stage)
    ? "Processing Payment..."
    : "Secure Payment";
}

export function PaymentStatusPanel({
  stage,
  message,
  onOpenCheckout,
  onCheckStatus,
  onPrepare,
}: PaymentStatusPanelProps) {
  const active = ["loading", "opening", "verifying"].includes(stage);

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#EADFCC] bg-[#FFFCF6] text-[#171717] shadow-[0_22px_60px_rgba(88,56,19,0.12)]">
      <div className="border-b border-[#EADFCC] bg-white/65 px-6 py-5 sm:px-8">
        <Image
          src="/images/trs-logo.png"
          alt="The Rolling Stove"
          width={88}
          height={88}
          className="h-14 w-14 object-contain"
          priority
        />
      </div>

      <div className="relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(201,154,46,0.12),transparent_26%),radial-gradient(circle_at_85%_70%,rgba(227,23,47,0.08),transparent_28%)]"
        />

        <div className="relative mx-auto max-w-xl text-center" aria-live="polite">
          <span
            className={`mx-auto grid h-20 w-20 place-items-center rounded-full border ${stage === "cancelled" || stage === "failed" || stage === "invalid" ? "border-[#E3172F]/15 bg-[#E3172F]/10 text-[#C9162B]" : "border-[#C99A2E]/20 bg-[#C99A2E]/10 text-[#A97814]"}`}
          >
            <FontAwesomeIcon
              icon={
                active
                  ? faSpinner
                  : stage === "ready"
                    ? faCheck
                    : faCircleExclamation
              }
              className={`h-8 ${active ? "animate-spin" : ""}`}
            />
          </span>

          <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-[#B37A12]">
            The Rolling Stove
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-[#B7192C] sm:text-5xl">
            {paymentTitle(stage)}
          </h1>
          <div className="mx-auto mt-5 h-px w-36 bg-gradient-to-r from-transparent via-[#C99A2E] to-transparent" />
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#625A50]">
            {message}
          </p>

          {active && <PaymentProgress stage={stage} />}
          {active && (
            <p className="mt-4 text-xs font-semibold text-[#8A8176]">
              Please don&apos;t close this page.
            </p>
          )}
          {stage === "cancelled" && (
            <p className="mt-3 text-xs text-[#746B60]">
              Food preparation begins only after successful payment.
            </p>
          )}
          {stage === "unknown" && (
            <p className="mt-3 text-xs font-bold text-[#A97814]">
              Please do not make another payment yet.
            </p>
          )}

          {stage === "failed" && (
            <div
              className="mx-auto mt-7 max-w-lg rounded-2xl border border-[#F2D4D8] bg-[#FFF5F6] p-4 text-left sm:p-5"
              role="alert"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#A97814]">
                Failure reason
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-[#8F1726]">
                {message}
              </p>
              <p className="mt-3 border-t border-[#F2D4D8] pt-3 text-xs leading-5 text-[#746B60]">
                If an amount appears deducted, wait for your bank or payment
                provider to update the transaction before trying again.
              </p>
            </div>
          )}

          <PaymentActions
            stage={stage}
            onOpenCheckout={onOpenCheckout}
            onCheckStatus={onCheckStatus}
            onPrepare={onPrepare}
          />
        </div>
      </div>

      <div className="grid gap-4 border-t border-[#EADFCC] bg-[#FFF8EC] px-6 py-5 text-[11px] font-semibold text-[#625A50] sm:grid-cols-3 sm:px-8">
        <span>
          <FontAwesomeIcon
            icon={faShieldHalved}
            className="mr-2 text-[#B7192C]"
          />
          Secure Razorpay payment
        </span>
        <span>
          <FontAwesomeIcon icon={faLock} className="mr-2 text-[#B7192C]" />
          Details handled by Razorpay
        </span>
        <span>
          <FontAwesomeIcon
            icon={faCreditCard}
            className="mr-2 text-[#B7192C]"
          />
          UPI, cards, net banking
        </span>
      </div>
    </section>
  );
}
