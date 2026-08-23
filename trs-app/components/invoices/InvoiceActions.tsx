"use client";

type InvoiceActionsProps = {
  orderId: string;
  audience: "admin" | "customer";
  className?: string;
};

export function InvoiceActions({
  orderId,
  audience,
  className,
}: InvoiceActionsProps) {
  const endpoint =
    audience === "admin"
      ? `/api/v1/admin/orders/${orderId}/invoice`
      : `/api/v1/customer/orders/${orderId}/invoice`;

  function openPrintableInvoice() {
    window.open(
      endpoint,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function downloadInvoice() {
    window.location.assign(
      `${endpoint}?download=true`,
    );
  }

  return (
    <div
      className={
        className ??
        "flex flex-wrap items-center gap-3"
      }
    >
      <button
        type="button"
        onClick={openPrintableInvoice}
        className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
      >
        Print invoice
      </button>

      <button
        type="button"
        onClick={downloadInvoice}
        className="rounded-lg border border-black px-4 py-2 text-sm font-semibold text-black"
      >
        Download invoice
      </button>
    </div>
  );
}
