import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { env } from "@/config/env";

const SIGNATURE_VERSION = "v1";

function secret() {
  const value =
    process.env.INVOICE_VERIFICATION_SECRET?.trim() ||
    process.env.ACCESS_TOKEN_SECRET?.trim();

  if (!value) {
    throw new Error(
      "INVOICE_VERIFICATION_SECRET is not configured.",
    );
  }

  return value;
}

export function createInvoicePublicId() {
  return randomUUID();
}

export function signInvoiceVerification(
  publicId: string,
  invoiceNumber: string,
) {
  return createHmac("sha256", secret())
    .update(
      `${SIGNATURE_VERSION}:${publicId}:${invoiceNumber}`,
      "utf8",
    )
    .digest("hex");
}

export function verifyInvoiceSignature(
  publicId: string,
  invoiceNumber: string,
  signature: string,
) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expected = signInvoiceVerification(
    publicId,
    invoiceNumber,
  );

  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex"),
  );
}

export function invoiceVerificationUrl(input: {
  publicId: string;
  invoiceNumber: string;
}) {
  const signature = signInvoiceVerification(
    input.publicId,
    input.invoiceNumber,
  );
  const baseUrl = env.APP_URL.replace(/\/$/, "");

  return `${baseUrl}/verify/invoice/${encodeURIComponent(
    input.publicId,
  )}?sig=${signature}`;
}

export function invoiceQrImageUrl(input: {
  publicId: string;
  invoiceNumber: string;
}) {
  const signature = signInvoiceVerification(
    input.publicId,
    input.invoiceNumber,
  );

  return `/api/v1/public/invoices/${encodeURIComponent(
    input.publicId,
  )}/qr?sig=${signature}`;
}
