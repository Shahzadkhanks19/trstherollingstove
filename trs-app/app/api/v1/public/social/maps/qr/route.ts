import {
  createSocialQrResponse,
  createThermalQrResponse,
  generateBrandedSocialQrSvg,
  generateThermalQrPng,
} from "@/lib/qr/social-qr";
import { TRS_GOOGLE_MAPS_URL } from "@/lib/social/instagram";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const thermal = new URL(request.url).searchParams.get("thermal") === "1";
  if (thermal) {
    return createThermalQrResponse(await generateThermalQrPng(TRS_GOOGLE_MAPS_URL));
  }

  const svg = await generateBrandedSocialQrSvg({
    value: TRS_GOOGLE_MAPS_URL,
    icon: "maps",
    gradientId: "maps-gradient",
    gradientStops: [
      { offset: "0%", color: "#34a853" },
      { offset: "35%", color: "#4285f4" },
      { offset: "68%", color: "#fbbc04" },
      { offset: "100%", color: "#ea4335" },
    ],
  });
  return createSocialQrResponse(svg);
}
