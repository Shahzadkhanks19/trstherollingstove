import type {
  ProductionInputLine,
  ProductionOutputLine,
  VendorQuoteLine,
} from "@/types/production-vendor";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateProductionCosts(
  inputs: ProductionInputLine[],
  outputs: ProductionOutputLine[]
) {
  const estimatedCost = roundMoney(
    inputs.reduce(
      (sum, line) => sum + line.plannedQuantity * line.unitCost,
      0
    )
  );

  const actualCost = roundMoney(
    inputs.reduce(
      (sum, line) => sum + line.actualQuantity * line.unitCost,
      0
    )
  );

  const totalActualOutput = outputs.reduce(
    (sum, line) => sum + line.actualQuantity,
    0
  );

  return {
    estimatedCost,
    actualCost,
    costPerOutputUnit:
      totalActualOutput > 0
        ? roundMoney(actualCost / totalActualOutput)
        : 0,
  };
}

export function calculateVendorQuoteTotals(lines: VendorQuoteLine[]) {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  );

  const taxTotal = roundMoney(
    lines.reduce(
      (sum, line) =>
        sum +
        line.quantity * line.unitPrice * (line.taxRate / 100),
      0
    )
  );

  return {
    subtotal,
    taxTotal,
    grandTotal: roundMoney(subtotal + taxTotal),
  };
}
