import type { Metadata } from "next";

const ADMIN_BRAND = "TRS Admin";

export function createAdminMetadata(title: string, description: string): Metadata {
  return {
    title: { absolute: `${title} | ${ADMIN_BRAND}` },
    description,
    robots: { index: false, follow: false, nocache: true },
  };
}
