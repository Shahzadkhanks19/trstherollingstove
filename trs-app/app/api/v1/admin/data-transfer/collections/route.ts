import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  listExportableCollections,
} from "@/services/dataExport.service";

export async function GET() {
  try {
    await requirePermission(
      "settings.manage",
    );
    await connectToDatabase();

    const collections =
      await listExportableCollections();

    return successResponse({
      collections,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
