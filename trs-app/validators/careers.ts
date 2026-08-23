import { z } from "zod";

const stringList = z.array(z.string().trim().min(1).max(300)).max(30).default([]);

const careerOpeningBaseSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  employmentType: z.enum(["Full-time", "Part-time", "Full-time / Part-time", "Internship"]),
  location: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(10).max(600),
  responsibilities: stringList,
  requirements: stringList,
  vacancies: z.number().int().min(1).max(100).default(1),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
  closesAt: z.iso.datetime().nullable().default(null),
});

export const createCareerOpeningSchema = careerOpeningBaseSchema.refine(
  (value) => value.closesAt === null || new Date(value.closesAt).getTime() > Date.now(),
  { message: "Closing date must be in the future.", path: ["closesAt"] },
);

export const updateCareerOpeningSchema = careerOpeningBaseSchema.partial().refine(
  (value) => value.closesAt == null || new Date(value.closesAt).getTime() > Date.now(),
  { message: "Closing date must be in the future.", path: ["closesAt"] },
);
