import { randomBytes } from "node:crypto";

import { CustomerProfile } from "@/models/CustomerProfile";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_GENERATION_ATTEMPTS = 12;

function normalizeNamePrefix(name: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  return (letters.slice(0, 4) || "TRS").padEnd(3, "X");
}

function randomCodeSegment(length: number): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function createReferralCodeCandidate(customerName: string): string {
  return `${normalizeNamePrefix(customerName)}${randomCodeSegment(5)}`;
}

export async function generateUniqueReferralCode(customerName: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = createReferralCodeCandidate(customerName);
    const exists = await CustomerProfile.exists({ referralCode: candidate });

    if (!exists) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique referral code.");
}
