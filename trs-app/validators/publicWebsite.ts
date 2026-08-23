import { z } from "zod";

export const publicPaginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

export const publicMenuQuerySchema =
  publicPaginationSchema.extend({
    category: z
      .string()
      .trim()
      .max(120)
      .optional(),
    search: z
      .string()
      .trim()
      .max(120)
      .optional(),
    featured: z.coerce
      .boolean()
      .optional(),
    bestseller: z.coerce
      .boolean()
      .optional(),
  });

export const publicReviewQuerySchema =
  publicPaginationSchema.extend({
    rating: z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .optional(),
  });

export const publicGalleryQuerySchema =
  publicPaginationSchema.extend({
    category: z
      .string()
      .trim()
      .max(120)
      .optional(),
  });

export const contactSubmissionSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(120),
    email: z
      .string()
      .trim()
      .email()
      .max(200),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+91)?[6-9]\d{9}$/, "Enter a valid Indian mobile number."),
    subject: z
      .string()
      .trim()
      .min(2)
      .max(200),
    message: z
      .string()
      .trim()
      .min(10)
      .max(5000),
  });
