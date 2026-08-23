import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url()
  .optional()
  .or(z.literal(""));

const productionReadinessSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_NAME: z.string().trim().min(1),
  APP_URL: z.string().trim().url(),
  MONGODB_URI: z.string().trim().min(1),

  NEXT_PUBLIC_REALTIME_SERVER_URL:
    z.string().trim().url(),

  ACCESS_TOKEN_SECRET:
    z.string().trim().min(32),
  REFRESH_TOKEN_SECRET:
    z.string().trim().min(32),

  ACCESS_TOKEN_TTL_SECONDS:
    z.coerce.number().int().positive().optional(),
  REFRESH_TOKEN_TTL_SECONDS:
    z.coerce.number().int().positive().optional(),

  RAZORPAY_KEY_ID:
    z.string().trim().optional(),
  RAZORPAY_KEY_SECRET:
    z.string().trim().optional(),
  RAZORPAY_WEBHOOK_SECRET:
    z.string().trim().optional(),

  EMAIL_PROVIDER_ENDPOINT: optionalUrl,
  EMAIL_PROVIDER_TOKEN:
    z.string().trim().optional(),

  WHATSAPP_PROVIDER_ENDPOINT: optionalUrl,
  WHATSAPP_PROVIDER_TOKEN:
    z.string().trim().optional(),

  CRON_SECRET:
    z.string().trim().min(24).optional(),
});

export type ProductionReadinessEnvironment =
  z.infer<typeof productionReadinessSchema>;

export type EnvironmentIssue = {
  field: string;
  message: string;
  severity: "error" | "warning";
};

function hasAny(
  values: Array<string | undefined>,
) {
  return values.some(
    (value) =>
      typeof value === "string" &&
      value.trim().length > 0,
  );
}

function hasAll(
  values: Array<string | undefined>,
) {
  return values.every(
    (value) =>
      typeof value === "string" &&
      value.trim().length > 0,
  );
}

export function inspectProductionEnvironment(
  source: NodeJS.ProcessEnv = process.env,
) {
  const parsed =
    productionReadinessSchema.safeParse(source);

  const issues: EnvironmentIssue[] = [];

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        field:
          issue.path.join(".") ||
          "environment",
        message: issue.message,
        severity: "error",
      });
    }
  }

  const paymentFields = [
    source.RAZORPAY_KEY_ID,
    source.RAZORPAY_KEY_SECRET,
    source.RAZORPAY_WEBHOOK_SECRET,
  ];

  if (
    hasAny(paymentFields) &&
    !hasAll(paymentFields)
  ) {
    issues.push({
      field: "razorpay",
      message:
        "Razorpay configuration is incomplete. Set all three Razorpay variables or remove all three while payment integration is disabled.",
      severity: "error",
    });
  }

  const emailFields = [
    source.EMAIL_PROVIDER_ENDPOINT,
    source.EMAIL_PROVIDER_TOKEN,
  ];

  if (
    hasAny(emailFields) &&
    !hasAll(emailFields)
  ) {
    issues.push({
      field: "email",
      message:
        "Email provider configuration is incomplete.",
      severity: "warning",
    });
  }

  const whatsappFields = [
    source.WHATSAPP_PROVIDER_ENDPOINT,
    source.WHATSAPP_PROVIDER_TOKEN,
  ];

  if (
    hasAny(whatsappFields) &&
    !hasAll(whatsappFields)
  ) {
    issues.push({
      field: "whatsapp",
      message:
        "WhatsApp provider configuration is incomplete.",
      severity: "warning",
    });
  }

  if (
    source.NODE_ENV === "production" &&
    source.APP_URL?.startsWith("http://")
  ) {
    issues.push({
      field: "APP_URL",
      message:
        "Production APP_URL must use HTTPS.",
      severity: "error",
    });
  }

  return {
    valid:
      issues.every(
        (issue) =>
          issue.severity !== "error",
      ),
    issues,
    environment:
      parsed.success
        ? parsed.data
        : null,
  };
}