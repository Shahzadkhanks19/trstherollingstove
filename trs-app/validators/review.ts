import { z } from "zod";

const ratingSchema = z.number().int().min(1).max(5);
const allowedTags = [
  "Delicious Food", "Fresh Ingredients", "Quick Service", "Great Taste", "Friendly Staff",
  "Good Portion", "Value for Money", "Hot & Fresh", "Premium Experience", "Clean Packaging",
] as const;
const imageDataUrl = z.string().refine(
  (value) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
  "Only JPEG, PNG, and WebP images are supported.",
).refine((value) => value.length <= 500_000, "Each compressed image must be smaller than 375 KB.");

export const createReviewSchema = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid order ID."),
  rating: ratingSchema,
  categoryRatings: z.object({
    foodQuality: ratingSchema,
    taste: ratingSchema,
    service: ratingSchema,
    speed: ratingSchema,
    packaging: ratingSchema.nullable(),
  }),
  recommendation: z.enum(["definitely", "maybe", "no"]),
  tags: z.array(z.enum(allowedTags)).max(10).default([]),
  title: z.string().trim().max(120).default(""),
  comment: z.string().trim().max(500).default(""),
  images: z.array(imageDataUrl).max(5).default([]),
});

export const updateReviewSchema = createReviewSchema.omit({ orderId: true }).partial();
export const moderateReviewSchema = z.object({
  status: z.enum(["published", "rejected", "hidden"]),
  moderationNote: z.string().trim().max(1000).default(""),
  isFeatured: z.boolean().optional(),
});
export const ownerReplySchema = z.object({ message: z.string().trim().min(2).max(1500) });
