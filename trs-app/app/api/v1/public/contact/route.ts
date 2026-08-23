import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import {
  createContactSubmission,
} from "@/services/publicWebsite.service";
import {
  contactSubmissionSchema,
} from "@/validators/publicWebsite";
import { publishEnquiryEvent } from "@/services/realtimeEvents.service";

export async function POST(
  request: Request,
) {
  try {
    const input =
      await validateRequestBody(
        request,
        contactSubmissionSchema,
      );

    await connectToDatabase();

    const result =
      await createContactSubmission(
        input,
      );

    publishEnquiryEvent({
      action: "created",
      enquiryId: String((result as { _id?: unknown })._id ?? (result as { id?: unknown }).id ?? ""),
    });

    return successResponse(
      result,
      "Contact message submitted.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
