import {
  createSocialQrResponse,
  createThermalQrResponse,
  generateBrandedSocialQrSvg,
  generateThermalQrPng,
} from "@/lib/qr/social-qr";
import { TRS_GOOGLE_REVIEW_URL } from "@/lib/social/instagram";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const thermal = new URL(request.url).searchParams.get("thermal") === "1";
  if (thermal) {
    return createThermalQrResponse(await generateThermalQrPng(TRS_GOOGLE_REVIEW_URL));
  }

  const svg = await generateBrandedSocialQrSvg({
    value: TRS_GOOGLE_REVIEW_URL,
    icon: "reviews",
    gradientId: "reviews-gradient",
    gradientStops: [
      { offset: "0%", color: "#f59e0b" },
      { offset: "45%", color: "#ea4335" },
      { offset: "100%", color: "#4285f4" },
    ],
  });
  return createSocialQrResponse(svg);
}
