import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const databaseConnected = mongoose.connection.readyState === 1;

    return successResponse(
      {
        application: "The Rolling Stove",
        status: "healthy",
        database: databaseConnected ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV,
      },
      "TRS backend is operational.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}