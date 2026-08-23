import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { requirePrintBridgeDevice } from "@/lib/print-bridge/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const device = await requirePrintBridgeDevice(request);
    return successResponse({
      id: String(device._id),
      name: device.name,
      isActive: device.isActive,
      printerName: device.printerName,
      printerAddress: device.printerAddress,
      lastSeenAt: device.lastSeenAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await connectToDatabase();
    const device = await requirePrintBridgeDevice(request);
    const body = await request.json() as {
      appVersion?: string;
      androidVersion?: string;
      manufacturer?: string;
      modelName?: string;
      printerName?: string;
      printerAddress?: string;
    };

    device.set({
      appVersion: body.appVersion?.trim().slice(0, 40) ?? device.appVersion,
      androidVersion: body.androidVersion?.trim().slice(0, 40) ?? device.androidVersion,
      manufacturer: body.manufacturer?.trim().slice(0, 80) ?? device.manufacturer,
      modelName: body.modelName?.trim().slice(0, 80) ?? device.modelName,
      printerName: body.printerName?.trim().slice(0, 120) ?? device.printerName,
      printerAddress: body.printerAddress?.trim().slice(0, 32) ?? device.printerAddress,
      lastSeenAt: new Date(),
      lastIpAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 80) ?? "",
    });
    await device.save();

    return successResponse({ id: String(device._id), lastSeenAt: device.lastSeenAt }, "Print bridge heartbeat recorded.");
  } catch (error) {
    return handleApiError(error);
  }
}
