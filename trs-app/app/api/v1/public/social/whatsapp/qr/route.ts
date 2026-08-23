import {
  createSocialQrResponse,
  createThermalQrResponse,
  generateBrandedSocialQrSvg,
  generateThermalQrPng,
} from "@/lib/qr/social-qr";
import { TRS_WHATSAPP_URL } from "@/lib/social/instagram";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const thermal = new URL(request.url).searchParams.get("thermal") === "1";
  if (thermal) {
    return createThermalQrResponse(await generateThermalQrPng(TRS_WHATSAPP_URL));
  }

  const svg = await generateBrandedSocialQrSvg({
    value: TRS_WHATSAPP_URL,
    icon: "whatsapp",
    gradientId: "whatsapp-gradient",
    gradientStops: [
      { offset: "0%", color: "#128c7e" },
      { offset: "100%", color: "#25d366" },
    ],
  });
  return createSocialQrResponse(svg);
}
