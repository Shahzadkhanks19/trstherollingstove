import { z } from "zod";
export const crmRebuildSchema=z.object({customerId:z.string().trim().min(1).optional(),limit:z.coerce.number().int().min(1).max(5000).default(1000)});
export const crmNoteSchema=z.object({title:z.string().trim().min(2).max(160),description:z.string().trim().max(1000).default("")});
