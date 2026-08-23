import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { SystemSetting } from "@/models/SystemSetting";

export const PUBLIC_ORDERING_DISABLED_CODE =
  "PUBLIC_ORDERING_DISABLED";

export type PublicOrderingAvailability = {
  enabled: boolean;
  message: string;
};

const DEFAULT_MESSAGE =
  "Online ordering is coming soon. We are putting the finishing touches on the experience. Please visit The Rolling Stove for dine-in or takeaway, or contact us for enquiries and complaints.";

export async function getPublicOrderingAvailability(): Promise<PublicOrderingAvailability> {
  await connectToDatabase();

  const setting = await SystemSetting.findOne({
    section: "ordering",
  })
    .select({ data: 1 })
    .lean();

  const data = setting?.data as
    | Record<string, unknown>
    | undefined;

  const enabled =
    data?.orderingEnabled === true &&
    data?.acceptingOrders === true;

  const configuredMessage =
    typeof data?.statusMessage === "string"
      ? data.statusMessage.trim()
      : "";

  return {
    enabled,
    message:
      enabled || !configuredMessage
        ? DEFAULT_MESSAGE
        : configuredMessage,
  };
}

export async function requirePublicOrderingEnabled() {
  const availability =
    await getPublicOrderingAvailability();

  if (!availability.enabled) {
    throw new AppError(
      availability.message,
      503,
      {
        code: PUBLIC_ORDERING_DISABLED_CODE,
      },
    );
  }

  return availability;
}
