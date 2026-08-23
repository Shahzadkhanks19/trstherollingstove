import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";

export function MediaPlaceholder({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-[inherit] border border-dashed border-[#d7b48a] bg-[linear-gradient(135deg,#fff8ed_0%,#f8ecdc_52%,#FFF8F2_100%)] ${className}`}
      aria-label={`${label} image placeholder`}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#C8102E]/8" />
      <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-[#da8a14]/10" />
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#d7b48a_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative flex h-full min-h-[92px] flex-col items-center justify-center gap-2 px-4 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-full border border-[#ead6bf] bg-white/80 text-[#bd7311] shadow-sm">
          <FontAwesomeIcon icon={faImage} className="h-4" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#5b4b3d]">{label}</span>
      </div>
    </div>
  );
}
