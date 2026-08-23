import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { CareerOpening } from "@/models/CareerOpening";

export async function GET() {
  try {
    await connectToDatabase();
    const now = new Date();
    const jobs = await CareerOpening.find({
      isPublished: true,
      $or: [{ closesAt: null }, { closesAt: { $gt: now } }],
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .select("title slug employmentType location summary responsibilities requirements vacancies closesAt")
      .lean();
    return successResponse(jobs);
  } catch (error) {
    return handleApiError(error);
  }
}
