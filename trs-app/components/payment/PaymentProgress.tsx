import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import type { PaymentStage } from "@/components/payment/PaymentActions";

type PaymentProgressProps = {
  stage: PaymentStage;
};

export function getPaymentProgress(stage: PaymentStage) {
  return stage === "loading"
    ? 38
    : stage === "opening"
      ? 78
      : stage === "verifying"
        ? 92
        : stage === "ready"
          ? 100
          : 0;
}

export function PaymentProgress({ stage }: PaymentProgressProps) {
  const progress = getPaymentProgress(stage);
  const steps = [
    { label: "Validating order", complete: progress >= 30 },
    { label: "Creating secure session", complete: progress >= 65 },
    { label: "Connecting to Razorpay", complete: progress >= 90 },
  ];

  return (
    <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-[#EADFCC] bg-white/80 p-4 text-left shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8D6515]">
          Payment progress
        </span>
        <span className="text-xs font-black tabular-nums text-[#B7192C]">
          {progress}%
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#F2E8D8]"
        role="progressbar"
        aria-label="Payment preparation progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#C99A2E] to-[#C91F32] transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className="flex items-center gap-2 text-[11px] font-bold text-[#625A50]"
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${step.complete ? "border-[#C91F32] bg-[#C91F32] text-white" : "border-[#DCCDAF] bg-[#FFF8EC] text-[#8D6515]"}`}
            >
              {step.complete ? (
                <FontAwesomeIcon icon={faCheck} className="h-2.5" />
              ) : (
                index + 1
              )}
            </span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
