import { buildPaymentManagementSnapshot } from "@/services/payment-management.service";

async function main() {
  const days = Math.min(3650, Math.max(1, Number(process.argv[2] ?? 30)));
  const snapshot = await buildPaymentManagementSnapshot({ days, source: "scheduled" });
  console.log(`Payment-management snapshot rebuilt for ${days} days: ${snapshot?.periodKey ?? "unknown"}`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
