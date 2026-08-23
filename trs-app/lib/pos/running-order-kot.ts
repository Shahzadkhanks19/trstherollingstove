import type { PosCartLine, PosCartState } from "@/types/pos";

export type RunningOrderKotAction =
  | "initial"
  | "addition"
  | "modification"
  | "cancellation"
  | "instruction_update";

export type RunningOrderKotItem = {
  action: RunningOrderKotAction;
  lineId: string;
  name: string;
  variantName?: string;
  specialInstructions?: string;
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  unitPrice: number;
  lineTotal: number;
  modifiers: Array<{ groupName?: string; optionName?: string }>;
  changeSummary: string[];
};

export type RunningOrderKotRevision = {
  revision: number;
  type: RunningOrderKotAction;
  items: RunningOrderKotItem[];
  orderNote: string;
  previousOrderNote: string;
  createdAt: Date;
  createdBy: string;
};

function modifierLabel(line: PosCartLine) {
  return line.modifiers.map((modifier) =>
    `${modifier.groupName}: ${modifier.optionName}${modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""}`,
  );
}

function lineFingerprint(line: PosCartLine) {
  return JSON.stringify({
    name: line.name,
    variantId: line.variantId,
    variantName: line.variantName,
    note: line.note.trim(),
    modifiers: line.modifiers.map((modifier) => ({
      groupId: modifier.groupId,
      optionId: modifier.optionId,
      quantity: modifier.quantity,
      unitPrice: modifier.unitPrice,
    })),
  });
}

function kotItem(
  line: PosCartLine,
  action: RunningOrderKotAction,
  quantity: number,
  changeSummary: string[] = [],
  previousQuantity?: number,
  newQuantity?: number,
): RunningOrderKotItem {
  return {
    action,
    lineId: line.lineId,
    name: line.name,
    variantName: line.variantName ?? undefined,
    specialInstructions: line.note.trim() || undefined,
    quantity,
    previousQuantity,
    newQuantity,
    unitPrice: line.unitPrice,
    lineTotal: line.unitPrice * quantity,
    modifiers: modifierLabel(line).map((optionName) => ({ optionName })),
    changeSummary,
  };
}

export function createInitialKotRevision(
  cart: PosCartState,
  actorId: string,
): RunningOrderKotRevision {
  return {
    revision: 1,
    type: "initial",
    items: cart.lines.map((line) =>
      kotItem(line, "initial", line.quantity, ["Initial kitchen order"]),
    ),
    orderNote: cart.orderNote.trim(),
    previousOrderNote: "",
    createdAt: new Date(),
    createdBy: actorId,
  };
}

export function createChangedKotRevision(
  previousCart: PosCartState,
  nextCart: PosCartState,
  revision: number,
  actorId: string,
): RunningOrderKotRevision | null {
  const previousByLine = new Map(previousCart.lines.map((line) => [line.lineId, line]));
  const nextByLine = new Map(nextCart.lines.map((line) => [line.lineId, line]));
  const items: RunningOrderKotItem[] = [];

  for (const nextLine of nextCart.lines) {
    const previousLine = previousByLine.get(nextLine.lineId);

    if (!previousLine) {
      items.push(
        kotItem(nextLine, "addition", nextLine.quantity, ["New item added"], 0, nextLine.quantity),
      );
      continue;
    }

    const contentChanged = lineFingerprint(previousLine) !== lineFingerprint(nextLine);

    if (contentChanged) {
      const changes: string[] = [];
      if (previousLine.variantName !== nextLine.variantName) {
        changes.push(`Variant: ${previousLine.variantName || "None"} → ${nextLine.variantName || "None"}`);
      }
      const oldModifiers = modifierLabel(previousLine).join(", ") || "None";
      const newModifiers = modifierLabel(nextLine).join(", ") || "None";
      if (oldModifiers !== newModifiers) changes.push(`Options: ${oldModifiers} → ${newModifiers}`);
      if (previousLine.note.trim() !== nextLine.note.trim()) {
        changes.push(`Instruction: ${previousLine.note.trim() || "None"} → ${nextLine.note.trim() || "None"}`);
      }
      if (previousLine.quantity !== nextLine.quantity) {
        changes.push(`Quantity: ${previousLine.quantity} → ${nextLine.quantity}`);
      }
      items.push(
        kotItem(
          nextLine,
          previousLine.note.trim() !== nextLine.note.trim() && changes.length === 1
            ? "instruction_update"
            : "modification",
          nextLine.quantity,
          changes.length ? changes : ["Item configuration updated"],
          previousLine.quantity,
          nextLine.quantity,
        ),
      );
      continue;
    }

    if (nextLine.quantity > previousLine.quantity) {
      const added = nextLine.quantity - previousLine.quantity;
      items.push(
        kotItem(nextLine, "addition", added, [`Add ${added} more`, `Quantity: ${previousLine.quantity} → ${nextLine.quantity}`], previousLine.quantity, nextLine.quantity),
      );
    } else if (nextLine.quantity < previousLine.quantity) {
      const cancelled = previousLine.quantity - nextLine.quantity;
      items.push(
        kotItem(previousLine, "cancellation", cancelled, [`Cancel ${cancelled}`, `Quantity: ${previousLine.quantity} → ${nextLine.quantity}`], previousLine.quantity, nextLine.quantity),
      );
    }
  }

  for (const previousLine of previousCart.lines) {
    if (nextByLine.has(previousLine.lineId)) continue;
    items.push(
      kotItem(previousLine, "cancellation", previousLine.quantity, ["Item removed from order"], previousLine.quantity, 0),
    );
  }

  const previousOrderNote = previousCart.orderNote.trim();
  const orderNote = nextCart.orderNote.trim();
  const noteChanged = previousOrderNote !== orderNote;

  if (!items.length && !noteChanged) return null;

  let type: RunningOrderKotAction = "modification";
  if (items.length && items.every((item) => item.action === "addition")) type = "addition";
  else if (items.length && items.every((item) => item.action === "cancellation")) type = "cancellation";
  else if (!items.length && noteChanged) type = "instruction_update";
  else if (items.length && items.every((item) => item.action === "instruction_update")) type = "instruction_update";

  return {
    revision,
    type,
    items,
    orderNote,
    previousOrderNote,
    createdAt: new Date(),
    createdBy: actorId,
  };
}
