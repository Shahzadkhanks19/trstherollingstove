import { toBuffer as renderQrPng, toString as renderQrSvg } from "qrcode";

import {
  SOCIAL_QR_ICONS,
  type SocialQrIconName,
} from "@/lib/qr/qr-icons";

interface GradientStop {
  readonly offset: string;
  readonly color: string;
}

interface BrandedSocialQrOptions {
  readonly value: string;
  readonly icon: SocialQrIconName;
  readonly gradientId: string;
  readonly gradientStops: readonly GradientStop[];
  readonly width?: number;
  readonly thermal?: boolean;
}

interface SvgViewBox {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

const DEFAULT_QR_WIDTH = 240;
const LOGO_PLATE_RATIO = 0.225;
const ICON_RATIO_OF_PLATE = 0.68;

function toResponseArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function readViewBox(svg: string): SvgViewBox {
  const match = svg.match(
    /viewBox=["']\s*(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/i,
  );

  if (!match) {
    throw new Error("Generated social QR SVG does not contain a valid viewBox.");
  }

  const [, minXValue, minYValue, widthValue, heightValue] = match;
  const minX = Number(minXValue);
  const minY = Number(minYValue);
  const width = Number(widthValue);
  const height = Number(heightValue);

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("Generated social QR SVG has invalid viewBox dimensions.");
  }

  return { minX, minY, width, height };
}

function createGradientDefinition(
  gradientId: string,
  stops: readonly GradientStop[],
): string {
  const stopMarkup = stops
    .map(
      ({ offset, color }) =>
        `<stop offset="${offset}" stop-color="${color}"/>`,
    )
    .join("");

  return `<defs><linearGradient id="${gradientId}" x1="0%" y1="100%" x2="100%" y2="0%">${stopMarkup}</linearGradient><filter id="social-qr-logo-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0.35" stdDeviation="0.55" flood-color="#0f172a" flood-opacity="0.2"/></filter></defs>`;
}

function createCenteredIcon(
  iconName: SocialQrIconName,
  viewBox: SvgViewBox,
  thermal: boolean,
): string {
  const sourceIcon = SOCIAL_QR_ICONS[iconName];
  const icon = thermal
    ? {
        ...sourceIcon,
        svg: sourceIcon.svg
          .replace(/#[0-9A-Fa-f]{6}/g, (color) =>
            color.toUpperCase() === "#FFFFFF" ? "#FFFFFF" : "#000000",
          ),
      }
    : sourceIcon;
  const shortestSide = Math.min(viewBox.width, viewBox.height);
  const plateSize = shortestSide * (thermal ? 0.18 : LOGO_PLATE_RATIO);
  const plateX = viewBox.minX + (viewBox.width - plateSize) / 2;
  const plateY = viewBox.minY + (viewBox.height - plateSize) / 2;
  const cornerRadius = plateSize * 0.24;
  const iconSize = plateSize * ICON_RATIO_OF_PLATE;
  const iconX = viewBox.minX + (viewBox.width - iconSize) / 2;
  const iconY = viewBox.minY + (viewBox.height - iconSize) / 2;
  const iconScale = iconSize / icon.viewBoxSize;

  return `
    <g aria-hidden="true" pointer-events="none">
      <rect x="${plateX}" y="${plateY}" width="${plateSize}" height="${plateSize}" rx="${cornerRadius}" fill="#ffffff"${thermal ? "" : ` filter="url(#social-qr-logo-shadow)"`}/>
      <g transform="translate(${iconX} ${iconY}) scale(${iconScale})">
        ${icon.svg}
      </g>
    </g>
  `;
}

export async function generateBrandedSocialQrSvg({
  value,
  icon,
  gradientId,
  gradientStops,
  width = DEFAULT_QR_WIDTH,
  thermal = false,
}: BrandedSocialQrOptions): Promise<string> {
  const renderWidth = thermal ? Math.max(width, 512) : width;
  const baseSvg = await renderQrSvg(value, {
    type: "svg",
    errorCorrectionLevel: thermal ? "M" : "H",
    margin: thermal ? 4 : 2,
    width: renderWidth,
    color: {
      dark: thermal ? "#000000" : "#111111",
      light: "#ffffff",
    },
  });

  if (thermal) {
    // Thermal printers need uninterrupted, high-contrast modules. Center logos
    // are deliberately omitted in this mode because they reduce scan margin.
    return baseSvg;
  }

  const viewBox = readViewBox(baseSvg);
  const centeredIcon = createCenteredIcon(icon, viewBox, false);

  const definitions = createGradientDefinition(gradientId, gradientStops);

  return baseSvg
    .replace(/(<svg\b[^>]*>)/i, `$1${definitions}`)
    .replace(/stroke=["']#111111["']/gi, `stroke="url(#${gradientId})"`)
    .replace(/fill=["']#111111["']/gi, `fill="url(#${gradientId})"`)
    .replace(/<\/svg>\s*$/i, `${centeredIcon}</svg>`);
}

export function createSocialQrResponse(svg: string): Response {
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function generateThermalQrPng(value: string): Promise<Uint8Array> {
  const png = await renderQrPng(value, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 640,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return new Uint8Array(png);
}

export function createThermalQrResponse(png: Uint8Array): Response {
  return new Response(toResponseArrayBuffer(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
