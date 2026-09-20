import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";

export type Person = { _id?: string; name?: string; email?: string };
export type Register = {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
};
export type MovementType =
  | "cash_in"
  | "cash_out"
  | "cash_sale"
  | "cash_refund";
export type CashMovement = {
  _id: string;
  type: MovementType;
  amount: number;
  reason: string;
  referenceType: "manual" | "order" | "payment" | "refund";
  createdAt: string;
  createdBy?: Person | string;
};
export type Shift = {
  _id: string;
  status?: "open" | "closed";
  expectedCash: number;
  openingCash: number;
  countedCash?: number | null;
  cashDifference?: number | null;
  registerId: Register;
  openedBy?: Person | string;
  closedBy?: Person | string;
  openedAt?: string;
  closedAt?: string | null;
  closingNote?: string;
  movements?: CashMovement[];
  movementSummary?: {
    openingCash: number;
    cashIn: number;
    cashOut: number;
    cashSales: number;
    cashRefunds: number;
    manualNet: number;
    calculatedExpectedCash: number;
  };
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function personName(person?: Person | string) {
  if (!person || typeof person === "string") return "TRS staff";
  return person.name || person.email || "TRS staff";
}

function movementLabel(type: MovementType) {
  if (type === "cash_in") return "Cash added";
  if (type === "cash_out") return "Cash taken out";
  if (type === "cash_sale") return "Cash sale";
  return "Cash refund";
}

function movementPositive(type: MovementType) {
  return type === "cash_in" || type === "cash_sale";
}

export function PosCashDrawerLedger({
  shift,
  compact = false,
}: {
  shift: Shift;
  compact?: boolean;
}) {
  const movements = shift.movements ?? [];
  const summary = shift.movementSummary;

  return (
    <section className="min-w-0 rounded-2xl border border-[#e5d9cf] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#C8102E]">
            Cash audit ledger
          </p>
          <h3 className="mt-1 text-base font-black text-[#122b3c]">
            {shift.registerId?.name ?? "Register"} ·{" "}
            {shift.status === "closed" ? "Closed" : "Live"}
          </h3>
          <p className="mt-1 text-xs text-[#756960]">
            Opened{" "}
            {shift.openedAt ? dateTime.format(new Date(shift.openedAt)) : "today"}
            {shift.status === "closed" && shift.closedAt
              ? ` · Closed ${dateTime.format(new Date(shift.closedAt))}`
              : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${shift.status === "closed" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}
        >
          {shift.status ?? "open"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-[#f7f2ec] p-3">
          <p className="text-[9px] font-black uppercase text-[#8b7e75]">Opening</p>
          <p className="mt-1 text-sm font-black text-[#122b3c]">
            {money.format(shift.openingCash ?? 0)}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-[9px] font-black uppercase text-emerald-700">Cash added</p>
          <p className="mt-1 text-sm font-black text-emerald-900">
            {money.format(summary?.cashIn ?? 0)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-[9px] font-black uppercase text-amber-700">Cash out</p>
          <p className="mt-1 text-sm font-black text-amber-900">
            {money.format(summary?.cashOut ?? 0)}
          </p>
        </div>
        <div className="rounded-xl bg-[#111820] p-3 text-white">
          <p className="text-[9px] font-black uppercase text-white/55">Expected</p>
          <p className="mt-1 text-sm font-black">{money.format(shift.expectedCash ?? 0)}</p>
        </div>
      </div>

      <div className={`mt-4 space-y-2 ${compact ? "max-h-56" : "max-h-72"} overflow-y-auto pr-1 [scrollbar-width:thin]`}>
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-[#122b3c]">Opening cash</p>
            <p className="mt-1 text-[11px] text-[#756960]">
              Register opened by {personName(shift.openedBy)}
            </p>
          </div>
          <p className="shrink-0 text-sm font-black text-emerald-700">
            +{money.format(shift.openingCash ?? 0)}
          </p>
        </div>

        {movements.map((movement) => {
          const positive = movementPositive(movement.type);
          return (
            <article key={movement._id} className="flex items-start justify-between gap-3 rounded-xl border border-[#eadfd6] bg-white p-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${positive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  <FontAwesomeIcon icon={positive ? faArrowUp : faArrowDown} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#122b3c]">{movementLabel(movement.type)}</p>
                  <p className="mt-1 break-words text-[11px] text-[#756960]">
                    {movement.reason || "No reason recorded"}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-[#9a8c82]">
                    {dateTime.format(new Date(movement.createdAt))} · {personName(movement.createdBy)}
                  </p>
                </div>
              </div>
              <p className={`shrink-0 text-sm font-black ${positive ? "text-emerald-700" : "text-amber-700"}`}>
                {positive ? "+" : "−"}{money.format(movement.amount)}
              </p>
            </article>
          );
        })}

        {!movements.length ? (
          <p className="rounded-xl border border-dashed border-[#d9ccc2] px-3 py-5 text-center text-xs font-bold text-[#8b7e75]">
            No cash movements have been recorded yet.
          </p>
        ) : null}
      </div>

      {shift.status === "closed" ? (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500">Expected</p>
            <p className="mt-1 text-xs font-black text-slate-900">{money.format(shift.expectedCash ?? 0)}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500">Counted</p>
            <p className="mt-1 text-xs font-black text-slate-900">{money.format(shift.countedCash ?? 0)}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500">Difference</p>
            <p className={`mt-1 text-xs font-black ${(shift.cashDifference ?? 0) === 0 ? "text-emerald-700" : "text-red-700"}`}>
              {money.format(shift.cashDifference ?? 0)}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
