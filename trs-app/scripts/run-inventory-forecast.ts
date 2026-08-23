import { connectToDatabase } from "../lib/db/mongoose";
import { generateInventoryForecast } from "../services/inventory-forecast.service";

async function main() {
  await connectToDatabase();

  const lookbackDays = Number(
    process.env.INVENTORY_FORECAST_LOOKBACK_DAYS ?? 90,
  );
  const horizonDays = Number(
    process.env.INVENTORY_FORECAST_HORIZON_DAYS ?? 30,
  );
  const leadTimeDays = Number(
    process.env.INVENTORY_FORECAST_LEAD_TIME_DAYS ?? 7,
  );

  const result = await generateInventoryForecast({
    lookbackDays,
    horizonDays,
    leadTimeDays,
    serviceLevelFactor: Number(
      process.env.INVENTORY_FORECAST_SERVICE_FACTOR ??
        1.65,
    ),
    source: "scheduled",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
