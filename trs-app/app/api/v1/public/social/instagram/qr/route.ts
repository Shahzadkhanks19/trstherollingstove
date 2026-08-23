import {
  createSocialQrResponse,
  createThermalQrResponse,
  generateBrandedSocialQrSvg,
  generateThermalQrPng,
} from "@/lib/qr/social-qr";
import { TRS_INSTAGRAM_PROFILE_URL } from "@/lib/social/instagram";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const thermal = new URL(request.url).searchParams.get("thermal") === "1";
  if (thermal) {
    return createThermalQrResponse(await generateThermalQrPng(TRS_INSTAGRAM_PROFILE_URL));
  }

  const svg = await generateBrandedSocialQrSvg({
    value: TRS_INSTAGRAM_PROFILE_URL,
    icon: "instagram",
    gradientId: "instagram-gradient",
    gradientStops: [
      { offset: "0%", color: "#feda75" },
      { offset: "24%", color: "#fa7e1e" },
      { offset: "50%", color: "#d62976" },
      { offset: "76%", color: "#962fbf" },
      { offset: "100%", color: "#4f5bd5" },
    ],
  });
  return createSocialQrResponse(svg);
}
