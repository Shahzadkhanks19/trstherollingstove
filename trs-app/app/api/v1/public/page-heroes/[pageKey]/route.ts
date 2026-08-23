import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getPageHeroDefinition } from "@/lib/page-hero-config";
import { PageHero } from "@/models/PageHero";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ pageKey: string }> }) {
  const { pageKey } = await context.params;
  if (!getPageHeroDefinition(pageKey)) return NextResponse.json({ data: null }, { status: 404 });
  try {
    await connectToDatabase();
    const hero = await PageHero.findOne({ pageKey, isActive: true }).lean();
    return NextResponse.json({ data: hero || null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ data: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
