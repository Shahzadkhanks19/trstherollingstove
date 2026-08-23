import { GridFSBucket, ObjectId } from "mongodb";
import mongoose from "mongoose";
import { AppError } from "@/lib/errors/AppError";

const BUCKET_NAME = "report-job-artifacts";

function bucket(): GridFSBucket {
  const database = mongoose.connection.db;
  if (!database) throw new AppError("Database connection is not ready.", 503);
  return new GridFSBucket(database, { bucketName: BUCKET_NAME });
}

export async function storeReportJobArtifact(input: {
  bytes: Buffer;
  filename: string;
  contentType: string;
  jobId: string;
  reportId: string;
}): Promise<{ key: string; size: number }> {
  const upload = bucket().openUploadStream(input.filename, {
    metadata: {
      jobId: input.jobId,
      reportId: input.reportId,
      contentType: input.contentType,
    },
  });
  await new Promise<void>((resolve, reject) => {
    upload.once("finish", () => resolve());
    upload.once("error", reject);
    upload.end(input.bytes);
  });
  return { key: String(upload.id), size: input.bytes.length };
}

export async function readReportJobArtifact(key: string): Promise<{
  stream: NodeJS.ReadableStream;
  filename: string;
  contentType: string;
  length: number;
}> {
  if (!ObjectId.isValid(key)) throw new AppError("Report output is unavailable.", 404);
  const id = new ObjectId(key);
  const file = await mongoose.connection.db?.collection(`${BUCKET_NAME}.files`).findOne({ _id: id });
  if (!file) throw new AppError("Report output is unavailable.", 404);
  return {
    stream: bucket().openDownloadStream(id),
    filename: String(file.filename || "report-output"),
    contentType: String(
      file.metadata?.contentType || file.contentType || "application/octet-stream",
    ),
    length: Number(file.length || 0),
  };
}

export async function deleteReportJobArtifact(key: string): Promise<void> {
  if (!ObjectId.isValid(key)) return;
  try { await bucket().delete(new ObjectId(key)); } catch { /* already removed */ }
}
