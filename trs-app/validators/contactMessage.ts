import { z } from "zod";

export const updateContactMessageSchema = z.object({
  status: z.enum(["new", "in_progress", "resolved", "closed"]).optional(),
  isRead: z.boolean().optional(),
  adminNote: z.string().trim().max(1500).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field." });
