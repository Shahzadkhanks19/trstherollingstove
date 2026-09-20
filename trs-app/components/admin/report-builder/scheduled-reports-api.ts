import type {
  ReportOption,
  Schedule,
  ScheduleDetail,
} from "@/components/admin/report-builder/scheduled-reports.types";

type ListResponse = {
  data?: {
    schedules?: Schedule[];
    reports?: ReportOption[];
  };
  message?: string;
};

type DetailResponse = {
  data?: ScheduleDetail;
  message?: string;
};

type MutationResponse = {
  message?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message || "Request failed.")
        : "Request failed.";
    throw new Error(message);
  }
  return payload;
}

export async function fetchScheduledReports(includeArchived: boolean) {
  const response = await fetch(
    `/api/v1/admin/report-builder/schedules?includeArchived=${includeArchived}`,
    { cache: "no-store" },
  );
  const payload = await readJson<ListResponse>(response);
  return {
    schedules: payload.data?.schedules ?? [],
    reports: payload.data?.reports ?? [],
  };
}

export async function fetchScheduledReportDetail(id: string) {
  const response = await fetch(
    `/api/v1/admin/report-builder/schedules/${id}`,
    { cache: "no-store" },
  );
  const payload = await readJson<DetailResponse>(response);
  if (!payload.data) throw new Error("Unable to load schedule history.");
  return payload.data;
}

export async function mutateScheduledReport(
  url: string,
  options: RequestInit,
) {
  const response = await fetch(url, options);
  const payload = await readJson<MutationResponse>(response);
  return payload.message || "Request completed.";
}
