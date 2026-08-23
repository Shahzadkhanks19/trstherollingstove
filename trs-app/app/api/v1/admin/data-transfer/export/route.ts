import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import {
  exportCollection,
  exportCollectionAsCsv,
} from "@/services/dataExport.service";
import {
  exportQuerySchema,
} from "@/validators/dataTransfer";

function downloadHeaders(
  filename: string,
  contentType: string,
) {
  return {
    "content-type": contentType,
    "content-disposition":
      `attachment; filename="${filename}"`,
    "cache-control": "no-store",
  };
}

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
      exportQuerySchema.parse(
        Object.fromEntries(
          url.searchParams.entries(),
        ),
      );

    const safeFileName =
      parsed.collection.replace(
        /[^a-zA-Z0-9_.-]/g,
        "_",
      );

    if (parsed.format === "csv") {
      const csv =
        await exportCollectionAsCsv(
          parsed.collection,
          parsed.limit,
        );

      return new Response(csv, {
        status: 200,
        headers: downloadHeaders(
          `${safeFileName}.csv`,
          "text/csv; charset=utf-8",
        ),
      });
    }

    const documents =
      await exportCollection(
        parsed.collection,
        parsed.limit,
      );

    return new Response(
      JSON.stringify(
        {
          collection:
            parsed.collection,
          exportedAt:
            new Date().toISOString(),
          count: documents.length,
          data: documents,
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: downloadHeaders(
          `${safeFileName}.json`,
          "application/json; charset=utf-8",
        ),
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
