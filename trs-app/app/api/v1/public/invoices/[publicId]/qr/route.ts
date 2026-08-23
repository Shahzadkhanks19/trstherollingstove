import { toBuffer as renderQrPng, toString as renderQrSvg } from "qrcode";

import { connectToDatabase } from "@/lib/db/mongoose";
import {
  invoiceVerificationUrl,
  verifyInvoiceSignature,
} from "@/lib/invoices/verification";
import { Invoice } from "@/models/Invoice";

type Context = {
  params: Promise<{ publicId: string }>;
};

export const dynamic = "force-dynamic";

function toResponseArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function GET(
  request: Request,
  context: Context,
) {
  const { publicId } = await context.params;
  const requestUrl = new URL(request.url);
  const signature = requestUrl.searchParams.get("sig") ?? "";
  const thermal = requestUrl.searchParams.get("thermal") === "1";

  await connectToDatabase();

  const invoice = await Invoice.findOne({
    verificationPublicId: publicId,
    verificationEnabled: { $ne: false },
  })
    .select({ invoiceNumber: 1 })
    .lean();

  if (
    !invoice ||
    !verifyInvoiceSignature(
      publicId,
      invoice.invoiceNumber,
      signature,
    )
  ) {
    return new Response("Invalid invoice verification request.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const verificationUrl = invoiceVerificationUrl({
    publicId,
    invoiceNumber: invoice.invoiceNumber,
  });

  if (thermal) {
    const png = await renderQrPng(verificationUrl, {
      errorCorrectionLevel: "L",
      margin: 4,
      width: 720,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return new Response(toResponseArrayBuffer(new Uint8Array(png)), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const svg = await renderQrSvg(
    verificationUrl,
    {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: {
        dark: "#111111",
        light: "#ffffff",
      },
    },
  );

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
