import type { Metadata } from "next";

import { connectToDatabase } from "@/lib/db/mongoose";
import { formatInvoiceMoney } from "@/lib/invoices/format";
import { verifyInvoiceSignature } from "@/lib/invoices/verification";
import { Invoice } from "@/models/Invoice";
import {
  TRS_CONTACT_NUMBER,
  TRS_CONTACT_TEL_URL,
  TRS_GOOGLE_MAPS_URL,
  TRS_GOOGLE_REVIEW_URL,
  TRS_INSTAGRAM_PROFILE_URL,
  TRS_INSTAGRAM_USERNAME,
  TRS_WHATSAPP_URL,
} from "@/lib/social/instagram";

export const metadata: Metadata = {
  title: "Verify Invoice | The Rolling Stove",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ sig?: string }>;
};

function InvalidInvoice() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f5ef] p-5">
      <section className="w-full max-w-lg rounded-[28px] border border-red-200 bg-white p-7 text-center shadow-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-3xl font-black text-red-700">×</div>
        <h1 className="mt-5 text-2xl font-black text-[#173044]">Invalid invoice</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">This link is invalid, altered, disabled, or does not belong to an invoice issued by The Rolling Stove.</p>
      </section>
    </main>
  );
}

export default async function VerifyInvoicePage({
  params,
  searchParams,
}: Props) {
  const { publicId } = await params;
  const { sig = "" } = await searchParams;

  await connectToDatabase();

  const invoice = await Invoice.findOne({
    verificationPublicId: publicId,
    verificationEnabled: { $ne: false },
  }).lean();

  if (
    !invoice ||
    !verifyInvoiceSignature(
      publicId,
      invoice.invoiceNumber,
      sig,
    )
  ) {
    return <InvalidInvoice />;
  }

  await Invoice.updateOne(
    { _id: invoice._id },
    {
      $set: { lastVerifiedAt: new Date() },
      $inc: { verificationCount: 1 },
    },
  );

  const currency = invoice.currency || "INR";
  const businessName =
    invoice.businessSnapshot?.tradeName ||
    invoice.businessSnapshot?.legalName ||
    "The Rolling Stove";

  return (
    <main className="min-h-screen bg-[#f8f5ef] px-4 py-8 sm:py-12">
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-[30px] border border-[#e7dcc1] bg-white shadow-2xl">
        <div className="h-2 bg-gradient-to-r from-[#c70d12] via-[#c8aa5b] to-[#ff4a1f]" />
        <div className="p-5 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#c70d12]">Official invoice verification</p>
              <h1 className="mt-2 text-3xl font-black text-[#173044]">{businessName}</h1>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-700">✓ Invoice verified</span>
          </div>

          <div className="mt-7 grid gap-3 rounded-2xl border border-[#eadfc7] bg-[#fffdf8] p-4 sm:grid-cols-2">
            <Detail label="Invoice" value={invoice.invoiceNumber} />
            <Detail label="Order" value={invoice.orderNumber} />
            <Detail label="Issued" value={new Date(invoice.issuedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} />
            <Detail label="Customer" value={invoice.customerSnapshot?.name || "Walk-in Customer"} />
            <Detail label="Order type" value={invoice.orderMode === "dine_in" ? `Dine-in${invoice.tableNumber ? ` · Table ${invoice.tableNumber}` : ""}` : "Takeaway"} />
            <Detail label="Payment" value={`${invoice.paymentMethod || "Not specified"} · ${invoice.paymentStatus || "Unknown"}`} />
          </div>

          <div className="mt-7">
            <h2 className="text-xs font-black uppercase tracking-[.16em] text-[#c70d12]">Invoice items</h2>
            <div className="mt-3 divide-y divide-[#eee5dc] overflow-hidden rounded-2xl border border-[#eadfc7]">
              {invoice.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-black text-[#173044]">{item.name}</p>
                    {item.variantName ? <p className="mt-1 text-xs text-slate-500">{item.variantName}</p> : null}
                    <p className="mt-1 text-xs font-bold text-slate-500">Quantity: {item.quantity}</p>
                  </div>
                  <strong className="shrink-0 text-[#173044]">{formatInvoiceMoney(item.lineTotal, currency)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 ml-auto max-w-sm space-y-2 rounded-2xl bg-[#173044] p-5 text-white">
            <TotalRow label="Subtotal" value={formatInvoiceMoney(invoice.subtotal, currency)} />
            <TotalRow label="Tax" value={formatInvoiceMoney(invoice.taxTotal, currency)} />
            <TotalRow label="Discount" value={`−${formatInvoiceMoney(invoice.discountTotal, currency)}`} />
            <div className="mt-3 flex items-center justify-between border-t border-white/20 pt-4 text-lg font-black"><span>Total</span><span>{formatInvoiceMoney(invoice.grandTotal, currency)}</span></div>
          </div>

          <section className="mt-8">
            <h2 className="text-center text-xs font-black uppercase tracking-[.18em] text-[#c70d12]">Stay connected with TRS</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Action href={TRS_INSTAGRAM_PROFILE_URL} title="Follow on Instagram" detail={`@${TRS_INSTAGRAM_USERNAME}`} />
              <Action href={TRS_GOOGLE_MAPS_URL} title="Google Maps directions" detail="Navigate to The Rolling Stove" />
              <Action href={TRS_CONTACT_TEL_URL} title="Call now" detail={`+91 ${TRS_CONTACT_NUMBER}`} />
              <Action href={TRS_WHATSAPP_URL} title="WhatsApp us" detail={`+91 ${TRS_CONTACT_NUMBER}`} />
              <Action href="/menu" title="View menu" detail="Online ordering coming soon" />
              <Action href={TRS_GOOGLE_REVIEW_URL} title="Leave a Google review" detail="Share your experience" />
              <Action href="/contact" title="Contact us" detail="Enquiries, complaints and catering" />
            </div>
          </section>

          <p className="mt-7 text-center text-xs leading-5 text-slate-500">Verified securely from the live TRS invoice database. Any later cancellation or refund is reflected through the current payment status shown above.</p>
        </div>
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-black text-[#173044]">{value}</p></div>;
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-white/70">{label}</span><strong>{value}</strong></div>;
}

function Action({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="rounded-2xl border border-[#eadfc7] bg-[#fffdf8] p-4 transition hover:-translate-y-0.5 hover:border-[#c8aa5b] hover:shadow-md">
      <strong className="block text-sm font-black text-[#173044]">{title}</strong>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span>
    </a>
  );
}
