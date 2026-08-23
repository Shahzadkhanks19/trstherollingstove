import { z } from "zod";

export const createBannerSchema = z.object({
  title: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(300).default(""),
  imageUrl: z.string().trim().min(1).max(1000),
  mobileImageUrl: z.string().trim().max(1000).default(""),
  ctaLabel: z.string().trim().max(80).default(""),
  ctaUrl: z.string().trim().max(1000).default(""),
  placement: z.enum([
    "home_hero",
    "home_offer",
    "menu",
    "checkout",
    "global",
  ]),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startsAt: z.iso.datetime().nullable().default(null),
  endsAt: z.iso.datetime().nullable().default(null),
});

export const updateBannerSchema = createBannerSchema.partial();

export const createGalleryItemSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).default(""),
  mediaType: z.enum(["image", "video"]).default("image"),
  mediaUrl: z.string().trim().min(1).max(1000),
  thumbnailUrl: z.string().trim().max(1000).default(""),
  category: z.string().trim().min(1).max(100).default("General"),
  altText: z.string().trim().max(200).default(""),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
});

export const updateGalleryItemSchema =
  createGalleryItemSchema.partial();

export const createTestimonialSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  designation: z.string().trim().max(120).default(""),
  message: z.string().trim().min(2).max(1500),
  rating: z.number().int().min(1).max(5).default(5),
  avatarUrl: z.string().trim().max(1000).default(""),
  source: z.enum(["manual", "google", "review"]).default("manual"),
  sourceUrl: z.string().trim().max(1000).default(""),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateTestimonialSchema =
  createTestimonialSchema.partial();
