import mongoose from "mongoose";
import type {
  Collection,
  Document,
} from "mongodb";

import { AppError } from "@/lib/errors/AppError";

export function getReportCollection<
  TSchema extends Document = Document,
>(name: string): Collection<TSchema> {
  const database = mongoose.connection.db;

  if (!database) {
    throw new AppError(
      "Database connection is not available.",
      500,
    );
  }

  return database.collection<TSchema>(name);
}