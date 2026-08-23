import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { CareerOpening } from "@/models/CareerOpening";
import { JobApplication } from "@/models/JobApplication";

export const runtime = "nodejs";

const inputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid Indian mobile number."),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  position: z.string().trim().min(1).max(180),
  experience: z.string().trim().max(200).default(""),
  message: z.string().trim().max(1500).default(""),
});

const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const input = inputSchema.parse({
      name: formData.get("name"), phone: formData.get("phone"), email: formData.get("email"),
      position: formData.get("position"), experience: formData.get("experience") || "", message: formData.get("message") || "",
    });
    await connectToDatabase();
    const identityFilter = /^[a-f\d]{24}$/i.test(input.position)
      ? { _id: input.position }
      : { $or: [{ title: input.position }, { slug: input.position }] };
    const opening = await CareerOpening.findOne({
      ...identityFilter,
      isPublished: true,
      $or: [{ closesAt: null }, { closesAt: { $gt: new Date() } }],
    }).lean();
    if (!opening) throw new AppError("This job opening is unavailable or has closed.", 400);

    const recent = await JobApplication.exists({ opening: opening._id, email: input.email, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    if (recent) throw new AppError("You already applied for this role recently.", 409);

    let resumeUrl = ""; let resumeOriginalName = "";
    const resume = formData.get("resume");
    if (resume instanceof File && resume.size > 0) {
      const extension = RESUME_TYPES[resume.type];
      if (!extension) throw new AppError("Upload a PDF, DOC or DOCX resume.", 400);
      if (resume.size > 5 * 1024 * 1024) throw new AppError("Resume size must be 5 MB or less.", 400);
      const directory = path.join(process.cwd(), "public", "uploads", "careers");
      await mkdir(directory, { recursive: true });
      const filename = `${Date.now()}-${randomUUID()}.${extension}`;
      await writeFile(path.join(directory, filename), Buffer.from(await resume.arrayBuffer()));
      resumeUrl = `/uploads/careers/${filename}`; resumeOriginalName = resume.name.slice(0, 255);
    }

    const application = await JobApplication.create({
      opening: opening._id, openingTitle: opening.title, name: input.name, phone: input.phone,
      email: input.email, experience: input.experience, message: input.message, resumeUrl, resumeOriginalName,
    });
    return successResponse({ id: application._id }, "Application submitted.", 201);
  } catch (error) { return handleApiError(error); }
}
