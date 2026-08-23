import { Types } from "mongoose";

import { AutomationRule } from "@/models/AutomationRule";
import { CampaignAudience } from "@/models/CampaignAudience";
import { CampaignExecution } from "@/models/CampaignExecution";
import { CustomerInsight } from "@/models/CustomerInsight";
import { CustomerProfile } from "@/models/CustomerProfile";
import {
  MarketingCampaign,
  type MarketingCampaignDocument,
} from "@/models/MarketingCampaign";
import { User } from "@/models/User";

type CampaignInput = {
  name: string;
  description?: string;
  channel: "email" | "whatsapp" | "sms" | "push";
  subject?: string;
  message: string;
  audience: {
    type: "all" | "segment" | "risk" | "manual";
    segmentKeys: string[];
    riskLevels: ("low" | "medium" | "high")[];
    customerIds: string[];
  };
  sendAt: Date | null;
  timezone: string;
};

type CampaignMetrics = {
  audienceSize: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  converted: number;
};

function createEmptyMetrics(): CampaignMetrics {
  return {
    audienceSize: 0,
    queued: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
  };
}

export async function getMarketingSummary() {
  const [campaigns, automations, executions] = await Promise.all([
    MarketingCampaign.find().select("status metrics").lean(),
    AutomationRule.find().select("isActive runCount").lean(),
    CampaignExecution.find().select("status").lean(),
  ]);

  const totals = campaigns.reduce(
    (accumulator, campaign) => ({
      audience:
        accumulator.audience + (campaign.metrics?.audienceSize ?? 0),
      sent: accumulator.sent + (campaign.metrics?.sent ?? 0),
      delivered:
        accumulator.delivered + (campaign.metrics?.delivered ?? 0),
      failed: accumulator.failed + (campaign.metrics?.failed ?? 0),
      opened: accumulator.opened + (campaign.metrics?.opened ?? 0),
      clicked: accumulator.clicked + (campaign.metrics?.clicked ?? 0),
      converted:
        accumulator.converted + (campaign.metrics?.converted ?? 0),
    }),
    {
      audience: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
    },
  );

  return {
    campaignCount: campaigns.length,
    draftCampaigns: campaigns.filter(
      (campaign) => campaign.status === "draft",
    ).length,
    scheduledCampaigns: campaigns.filter(
      (campaign) => campaign.status === "scheduled",
    ).length,
    activeAutomations: automations.filter(
      (automation) => automation.isActive,
    ).length,
    automationRuns: automations.reduce(
      (sum, automation) => sum + (automation.runCount ?? 0),
      0,
    ),
    ...totals,
    deliveryRate: totals.sent
      ? Number(((totals.delivered / totals.sent) * 100).toFixed(1))
      : 0,
    openRate: totals.delivered
      ? Number(((totals.opened / totals.delivered) * 100).toFixed(1))
      : 0,
    clickRate: totals.delivered
      ? Number(((totals.clicked / totals.delivered) * 100).toFixed(1))
      : 0,
    executionCount: executions.length,
  };
}

export async function listCampaigns(params: URLSearchParams) {
  const page = Math.max(1, Number(params.get("page") || 1));
  const limit = Math.min(
    100,
    Math.max(1, Number(params.get("limit") || 20)),
  );
  const status = params.get("status") || "";

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  const [rows, total] = await Promise.all([
    MarketingCampaign.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MarketingCampaign.countDocuments(filter),
  ]);

  return {
    rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function createCampaign(
  input: CampaignInput,
  userId: string,
) {
  return MarketingCampaign.create({
    ...input,
    schedule: {
      sendAt: input.sendAt,
      timezone: input.timezone,
    },
    createdBy: userId,
    status:
      input.sendAt && input.sendAt.getTime() > Date.now()
        ? "scheduled"
        : "draft",
  });
}

export async function updateCampaign(
  id: string,
  input: Partial<CampaignInput>,
) {
  const update: Record<string, unknown> = { ...input };

  if ("sendAt" in input || "timezone" in input) {
    update.schedule = {
      sendAt: input.sendAt ?? null,
      timezone: input.timezone ?? "Asia/Kolkata",
    };

    delete update.sendAt;
    delete update.timezone;
  }

  return MarketingCampaign.findByIdAndUpdate(
    id,
    { $set: update },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
}

export async function deleteCampaign(id: string) {
  const campaign = await MarketingCampaign.findById(id).lean();

  if (!campaign) {
    return false;
  }

  if (["running", "completed"].includes(campaign.status)) {
    throw new Error(
      "Running or completed campaigns cannot be deleted.",
    );
  }

  await Promise.all([
    MarketingCampaign.deleteOne({ _id: id }),
    CampaignExecution.deleteMany({ campaignId: id }),
  ]);

  return true;
}

async function resolveAudience(
  campaign: MarketingCampaignDocument | null,
): Promise<Types.ObjectId[]> {
  if (!campaign) {
    return [];
  }

  const audience = campaign.audience;

  if (!audience) {
    return [];
  }

  if (audience.type === "manual") {
    return (audience.customerIds ?? []) as Types.ObjectId[];
  }

  const filter: Record<string, unknown> = {};

  if (
    audience.type === "segment" &&
    (audience.segmentKeys?.length ?? 0) > 0
  ) {
    filter.segmentKeys = {
      $in: audience.segmentKeys,
    };
  }

  if (
    audience.type === "risk" &&
    (audience.riskLevels?.length ?? 0) > 0
  ) {
    filter.riskLevel = {
      $in: audience.riskLevels,
    };
  }

  const insights = await CustomerInsight.find(filter)
    .select("customerId")
    .lean();

  return insights.map(
    (insight) => insight.customerId as Types.ObjectId,
  );
}

function destinationFor(
  channel: string,
  user: {
    _id: unknown;
    email?: string | null;
    phone?: string | null;
  },
  profile: {
    marketingEmailOptIn?: boolean | null;
    marketingWhatsAppOptIn?: boolean | null;
  } | null,
) {
  if (channel === "email") {
    return profile?.marketingEmailOptIn && user.email
      ? user.email
      : "";
  }

  if (channel === "whatsapp") {
    return profile?.marketingWhatsAppOptIn && user.phone
      ? user.phone
      : "";
  }

  if (channel === "sms") {
    return user.phone ?? "";
  }

  return String(user._id ?? "");
}

export async function runCampaign(
  id: string,
  dryRun = false,
) {
  const campaign = await MarketingCampaign.findById(id);

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (
    ["running", "completed", "cancelled"].includes(
      campaign.status,
    )
  ) {
    throw new Error(
      `Campaign cannot run while ${campaign.status}.`,
    );
  }

  const customerIds = await resolveAudience(campaign);

  if (dryRun) {
    return {
      campaignId: id,
      audienceSize: customerIds.length,
      dryRun: true,
    };
  }

  campaign.status = "running";
  campaign.lastRunAt = new Date();
  campaign.metrics ??= createEmptyMetrics();
  campaign.metrics.audienceSize = customerIds.length;

  await campaign.save();

  let queued = 0;
  let skipped = 0;

  for (const customerId of customerIds) {
    const [user, profile] = await Promise.all([
      User.findById(customerId)
        .select("_id email phone")
        .lean(),
      CustomerProfile.findOne({
        userId: customerId,
      })
        .select(
          "marketingEmailOptIn marketingWhatsAppOptIn",
        )
        .lean(),
    ]);

    if (!user) {
      skipped += 1;
      continue;
    }

    const destination = destinationFor(
      campaign.channel,
      user,
      profile,
    );
    const status = destination ? "queued" : "skipped";

    await CampaignExecution.findOneAndUpdate(
      {
        campaignId: campaign._id,
        customerId,
      },
      {
        $setOnInsert: {
          campaignId: campaign._id,
          customerId,
          channel: campaign.channel,
          destination,
          status,
          skipReason: destination
            ? ""
            : "No eligible destination or marketing opt-in.",
          queuedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    if (destination) {
      queued += 1;
    } else {
      skipped += 1;
    }
  }

  campaign.metrics ??= createEmptyMetrics();
  campaign.metrics.queued = queued;
  campaign.metrics.failed = skipped;
  campaign.status = "completed";
  campaign.completedAt = new Date();

  await campaign.save();

  return {
    campaignId: id,
    audienceSize: customerIds.length,
    queued,
    skipped,
    status: campaign.status,
  };
}

export async function processQueuedExecutions(
  limit = 100,
) {
  const rows = await CampaignExecution.find({
    status: "queued",
  })
    .sort({ queuedAt: 1 })
    .limit(limit);

  let sent = 0;

  for (const row of rows) {
    row.status = "sent";
    row.sentAt = new Date();
    row.provider = "provider-ready";

    await row.save();

    sent += 1;

    await MarketingCampaign.updateOne(
      {
        _id: row.campaignId,
      },
      {
        $inc: {
          "metrics.sent": 1,
          "metrics.delivered": 1,
        },
      },
    );

    row.status = "delivered";
    row.deliveredAt = new Date();

    await row.save();
  }

  return {
    processed: rows.length,
    sent,
    generatedAt: new Date(),
  };
}

export async function listExecutions(
  campaignId: string,
) {
  return CampaignExecution.find({
    campaignId,
  })
    .populate("customerId", "name email phone")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
}

export async function listAutomations() {
  return AutomationRule.find()
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
}

export async function createAutomation(
  input: Record<string, unknown>,
  userId: string,
) {
  return AutomationRule.create({
    ...input,
    createdBy: userId,
  });
}

export async function updateAutomation(
  id: string,
  input: Record<string, unknown>,
) {
  return AutomationRule.findByIdAndUpdate(
    id,
    {
      $set: input,
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
}

export async function deleteAutomation(id: string) {
  return Boolean(
    await AutomationRule.findByIdAndDelete(id),
  );
}

export async function listAudiences() {
  return CampaignAudience.find()
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
}

export async function createAudience(
  input: Record<string, unknown>,
  userId: string,
) {
  return CampaignAudience.create({
    ...input,
    createdBy: userId,
  });
}

export async function deleteAudience(id: string) {
  return Boolean(
    await CampaignAudience.findByIdAndDelete(id),
  );
}

export async function runDueCampaigns() {
  const dueCampaigns = await MarketingCampaign.find({
    status: "scheduled",
    "schedule.sendAt": {
      $lte: new Date(),
    },
  })
    .select("_id")
    .lean();

  const results = [];

  for (const campaign of dueCampaigns) {
    results.push(
      await runCampaign(String(campaign._id)),
    );
  }

  return {
    due: dueCampaigns.length,
    results,
    generatedAt: new Date(),
  };
}