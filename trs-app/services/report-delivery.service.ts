import nodemailer from "nodemailer";
import { Readable } from "stream";
import { AppError } from "@/lib/errors/AppError";
import { readReportJobArtifact } from "@/services/report-job-artifact.service";

function smtpConfig() {
  const host = process.env.SMTP_HOST ?? process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT ?? process.env.EMAIL_PORT ?? "587");
  const user = process.env.SMTP_USER ?? process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS ?? process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? user;
  if (!host || !user || !pass || !from || !Number.isFinite(port)) return null;
  return { host, port, secure: port === 465, auth: { user, pass }, from };
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as Readable) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function deliverReportJobArtifact(input: {
  outputKey: string;
  outputFilename: string;
  recipients: string[];
  reportName: string;
}): Promise<{ delivered: number; skipped: boolean }> {
  const recipients = [...new Set(input.recipients.map((value) => value.trim().toLowerCase()).filter(Boolean))];
  if (!recipients.length) return { delivered: 0, skipped: true };
  const config = smtpConfig();
  if (!config) throw new AppError("SMTP settings are not configured for scheduled-report delivery.", 503);
  const artifact = await readReportJobArtifact(input.outputKey);
  const bytes = await streamToBuffer(artifact.stream);
  const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: config.auth });
  await transporter.sendMail({
    from: config.from,
    to: recipients.join(","),
    subject: `TRS Scheduled Report: ${input.reportName}`,
    text: `Your scheduled TRS report \"${input.reportName}\" is attached.`,
    html: `<p>Your scheduled TRS report <strong>${input.reportName}</strong> is attached.</p>`,
    attachments: [{ filename: input.outputFilename || artifact.filename, content: bytes, contentType: artifact.contentType }],
  });
  return { delivered: recipients.length, skipped: false };
}
