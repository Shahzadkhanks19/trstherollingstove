import { getBusinessForecast, type BusinessForecastResult } from "@/services/business-forecast.service";
import { getLatestExecutiveBI } from "@/services/executive-bi.service";
import { getKpiIntelligence, type KpiIntelligenceResult } from "@/services/kpi-intelligence.service";
import { getProcurementIntelligence, type ProcurementIntelligenceResult } from "@/services/procurement-intelligence.service";

export type UnifiedExecutiveAlert = {
  source: "kpi" | "procurement" | "forecast";
  severity: "low" | "medium" | "high" | "critical";
  code: string;
  title: string;
  message: string;
  suggestedAction: string;
};

export type ExecutiveBIIntelligenceResult = {
  generatedAt: string;
  executive: Awaited<ReturnType<typeof getLatestExecutiveBI>>;
  kpi: KpiIntelligenceResult;
  forecast: BusinessForecastResult;
  procurement: ProcurementIntelligenceResult;
  alerts: UnifiedExecutiveAlert[];
  actualVsForecast: Array<{
    date: string;
    kind: "actual" | "forecast";
    revenue: number;
    lowerRevenue?: number;
    upperRevenue?: number;
  }>;
  summary: {
    currentRevenue: number;
    forecast30Revenue: number;
    forecast30FoodCost: number;
    revenueChangePercent: number;
    inventoryHealthScore: number;
    forecastQualityScore: number;
    criticalProcurementItems: number;
    totalAlerts: number;
    criticalAlerts: number;
  };
};

const severityRank: Record<UnifiedExecutiveAlert["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function getExecutiveBIIntelligence(input: {
  requestedBy?: string | null;
  refresh?: boolean;
  lookbackDays?: number;
}): Promise<ExecutiveBIIntelligenceResult> {
  const lookbackDays = input.lookbackDays ?? 30;
  const [executive, kpi, forecast, procurement] = await Promise.all([
    getLatestExecutiveBI(),
    getKpiIntelligence({ lookbackDays, requestedBy: input.requestedBy, refresh: input.refresh }),
    getBusinessForecast({ lookbackDays: Math.max(60, lookbackDays), requestedBy: input.requestedBy, refresh: input.refresh }),
    getProcurementIntelligence({
      lookbackDays: Math.max(60, lookbackDays),
      horizonDays: 30,
      leadTimeDays: 7,
      requestedBy: input.requestedBy,
      refresh: input.refresh,
    }),
  ]);

  const alerts: UnifiedExecutiveAlert[] = [
    ...kpi.alerts.map((alert) => ({ ...alert, source: "kpi" as const })),
    ...procurement.alerts.map((alert) => ({ ...alert, source: "procurement" as const })),
  ];

  if (forecast.quality.level === "low") {
    alerts.push({
      source: "forecast",
      severity: "medium",
      code: "forecast_data_quality",
      title: "Forecast confidence is limited",
      message: forecast.quality.message,
      suggestedAction: "Continue recording complete daily sales, inventory movement, wastage and internal-consumption data.",
    });
  }

  alerts.sort((left, right) => severityRank[left.severity] - severityRank[right.severity]);

  const actualVsForecast = [
    ...kpi.daily.slice(-14).map((row) => ({ date: row.date, kind: "actual" as const, revenue: row.revenue })),
    ...forecast.forecasts.slice(0, 14).map((row) => ({
      date: row.date,
      kind: "forecast" as const,
      revenue: row.revenue,
      lowerRevenue: row.lowerRevenue,
      upperRevenue: row.upperRevenue,
    })),
  ];

  return {
    generatedAt: new Date().toISOString(),
    executive,
    kpi,
    forecast,
    procurement,
    alerts,
    actualVsForecast,
    summary: {
      currentRevenue: kpi.kpis.revenue,
      forecast30Revenue: forecast.summary.forecast30Revenue,
      forecast30FoodCost: forecast.summary.forecast30FoodCost,
      revenueChangePercent: kpi.kpis.revenueChange,
      inventoryHealthScore: procurement.kpis.inventoryHealthScore,
      forecastQualityScore: forecast.quality.score,
      criticalProcurementItems: procurement.kpis.criticalItems + procurement.kpis.highRiskItems,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((alert) => alert.severity === "critical").length,
    },
  };
}
