"use client";

import { PaymentOrderSummary } from "@/components/payment/PaymentOrderSummary";
import { PaymentStatusPanel } from "@/components/payment/PaymentStatusPanel";
import { usePaymentProcessing } from "@/components/payment/use-payment-processing";

export function PaymentProcessingClient() {
  const {
    stage,
    statusData,
    message,
    openCheckout,
    checkStatus,
    prepare,
  } = usePaymentProcessing();

  return (
    <main className="min-h-screen bg-[#FFF9EF] px-4 py-8 text-[#171717] sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <PaymentStatusPanel
          stage={stage}
          message={message}
          onOpenCheckout={() => void openCheckout()}
          onCheckStatus={() => void checkStatus()}
          onPrepare={() => void prepare()}
        />

        <PaymentOrderSummary statusData={statusData} />
      </div>
    </main>
  );
}
