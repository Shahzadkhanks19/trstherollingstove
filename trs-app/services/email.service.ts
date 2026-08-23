import nodemailer from "nodemailer";

import { AppError } from "@/lib/errors/AppError";

type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function getEmailConfig() {
  const host = process.env.SMTP_HOST ?? process.env.EMAIL_HOST;
  const portValue = process.env.SMTP_PORT ?? process.env.EMAIL_PORT ?? "587";
  const user = process.env.SMTP_USER ?? process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS ?? process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? user;
  const port = Number(portValue);

  if (!host || !user || !pass || !from || !Number.isFinite(port)) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
  };
}

export async function sendTransactionalEmail(
  message: TransactionalEmail,
): Promise<boolean> {
  const config = getEmailConfig();

  if (!config) {
    console.warn(
      "Transactional email was not sent because SMTP settings are missing.",
      { to: message.to, subject: message.subject, text: message.text },
    );
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return true;
  } catch (error) {
    console.error("Transactional email delivery failed:", error);
    throw new AppError(
      "We could not send the email right now. Please try again shortly.",
      503,
      { code: "EMAIL_DELIVERY_FAILED" },
    );
  }
}
