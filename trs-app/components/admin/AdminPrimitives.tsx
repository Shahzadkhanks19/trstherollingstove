import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faArrowRight, faArrowTrendDown, faArrowTrendUp } from "@fortawesome/free-solid-svg-icons";

export function PageHeader({ eyebrow, title, description, action, actions }: { eyebrow: string; title: string; description: string; action?: React.ReactNode; actions?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#C8102E]">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] text-[#122b3c] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#6d625a]">{description}</p></div>{actions ?? action}</div>;
}
export function StatCard({ label, value, icon, change, detail }: { label: string; value: string; icon: IconDefinition; change?: number; detail: string }) {
  const positive = (change ?? 0) >= 0;
  return <article className="rounded-[22px] border border-[#e8ddd3] bg-[#fffdf9] p-5 shadow-[0_10px_32px_rgba(30,35,40,.055)]"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.17em] text-[#8a7e75]">{label}</p><p className="mt-3 text-2xl font-black tracking-[-.04em] text-[#122b3c] sm:text-3xl">{value}</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0e8] text-[#C8102E]"><FontAwesomeIcon icon={icon} className="h-4"/></span></div><div className="mt-4 flex items-center justify-between gap-2"><span className="text-[10px] font-bold text-[#8f837a]">{detail}</span>{typeof change === "number" && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black ${positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}><FontAwesomeIcon icon={positive ? faArrowTrendUp : faArrowTrendDown}/>{Math.abs(change).toFixed(1)}%</span>}</div></article>;
}
export function SectionCard({ title, subtitle, description, children, href, className = "" }: { title?: string; subtitle?: string; description?: string; children: React.ReactNode; href?: string; className?: string }) {
  const supportingText = subtitle ?? description;
  return <section className={`overflow-hidden rounded-[24px] border border-[#e8ddd3] bg-[#fffdf9] shadow-[0_10px_32px_rgba(30,35,40,.05)] ${className}`}>
    {title ? <div className="flex items-center justify-between border-b border-[#eee4dc] px-5 py-4 sm:px-6"><div><h2 className="text-base font-black text-[#122b3c]">{title}</h2>{supportingText && <p className="mt-1 text-[11px] font-medium text-[#8b7e75]">{supportingText}</p>}</div>{href && <Link href={href} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#C8102E]">View all <FontAwesomeIcon icon={faArrowRight}/></Link>}</div> : null}
    <div className="p-5 sm:p-6">{children}</div>
  </section>;
}
export function StatusBadge({ value, children, tone }: { value?: string; children?: React.ReactNode; tone?: "success" | "neutral" | "warning" | "danger" | string }) {
  const text = value ?? (typeof children === "string" ? children : "");
  const tones: Record<string,string> = { completed:"bg-emerald-50 text-emerald-700", ready:"bg-blue-50 text-blue-700", preparing:"bg-amber-50 text-amber-700", pending:"bg-orange-50 text-orange-700", cancelled:"bg-red-50 text-red-700", approved:"bg-emerald-50 text-emerald-700", success:"bg-emerald-50 text-emerald-700", warning:"bg-amber-50 text-amber-700", danger:"bg-red-50 text-red-700", neutral:"bg-slate-100 text-slate-600" };
  const styleKey = tone ?? text;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${tones[styleKey] ?? "bg-slate-100 text-slate-600"}`}>{children ?? text.replaceAll("_", " ")}</span>;
}
