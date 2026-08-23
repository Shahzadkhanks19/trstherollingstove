import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import {
  parseCollectionList,
} from "@/lib/data-transfer/sanitize";
import {
  createLogicalBackup,
} from "@/services/backup.service";
import {
  backupQuerySchema,
} from "@/validators/dataTransfer";

export async function GET(
  request: Request,
) {
  try {
    await requirePermission(
      "settings.manage",
    );
    await connectToDatabase();

    const url = new URL(request.url);
    const parsed =
      backupQuerySchema.parse(
        Object.fromEntries(
          url.searchParams.entries(),
        ),
      );

    const backup =
      await createLogicalBackup({
        collections:
          parseCollectionList(
            parsed.collections,
          ),
        limitPerCollection:
          parsed.limitPerCollection,
      });

    const timestamp =
      new Date()
        .toISOString()
        .replaceAll(":", "-")
        .replaceAll(".", "-");

    return new Response(
      JSON.stringify(
        backup,
        null,
        2,
      ),
      {
        status: 200,
        headers: {
          "content-type":
            "application/json; charset=utf-8",
          "content-disposition":
            `attachment; filename="trs-backup-${timestamp}.json"`,
          "cache-control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
