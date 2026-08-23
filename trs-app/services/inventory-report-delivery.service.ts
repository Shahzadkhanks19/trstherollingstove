export type InventoryReportDeliveryResult = {
  recipient: string;
  status: "sent" | "skipped" | "failed";
  provider: string;
  messageId: string;
  error?: string;
};

function formatPreview(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "No rows were returned for this report.";

  return rows
    .slice(0, 10)
    .map((row, index) => `${index + 1}. ${JSON.stringify(row)}`)
    .join("\n");
}

export async function deliverInventoryReportByEmail(input: {
  recipients: string[];
  reportType: string;
  rows: Array<Record<string, unknown>>;
  generatedAt: Date;
}): Promise<InventoryReportDeliveryResult[]> {
  const recipients = Array.from(
    new Set(input.recipients.map((value) => value.trim().toLowerCase())),
  ).filter(Boolean);

  if (recipients.length === 0) return [];

  const endpoint = process.env.EMAIL_PROVIDER_ENDPOINT;
  const token = process.env.EMAIL_PROVIDER_TOKEN;

  if (!endpoint || !token) {
    return recipients.map((recipient) => ({
      recipient,
      status: "skipped",
      provider: "not_configured",
      messageId: "",
      error: "EMAIL_PROVIDER_ENDPOINT or EMAIL_PROVIDER_TOKEN is not configured.",
    }));
  }

  const subject = `TRS inventory ${input.reportType.replaceAll("_", " ")} report`;
  const text = [
    subject,
    `Generated: ${input.generatedAt.toISOString()}`,
    `Rows: ${input.rows.length}`,
    "",
    "Preview:",
    formatPreview(input.rows),
  ].join("\n");

  const results: InventoryReportDeliveryResult[] = [];

  for (const recipient of recipients) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: recipient,
          subject,
          text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email provider returned ${response.status}.`);
      }

      const payload = (await response.json().catch(() => ({}))) as {
        id?: string;
        messageId?: string;
      };

      results.push({
        recipient,
        status: "sent",
        provider: "http_email_provider",
        messageId: payload.id ?? payload.messageId ?? "",
      });
    } catch (error) {
      results.push({
        recipient,
        status: "failed",
        provider: "http_email_provider",
        messageId: "",
        error: error instanceof Error ? error.message : "Unknown email delivery error.",
      });
    }
  }

  return results;
}
