import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

const CHECKOUT_STEPS = ["Cart", "Checkout", "Payment", "Success"] as const;

export function CheckoutProgress() {
  return (
    <div className="border-b border-[#222] bg-[#090909] text-white">
      <div className="mx-auto flex w-[min(100%-2rem,1180px)] justify-between gap-3 overflow-x-auto py-5">
        {CHECKOUT_STEPS.map((label, index) => (
          <div
            key={label}
            className="flex min-w-[115px] items-center gap-3"
          >
            <span
              className={`grid h-10 w-10 place-items-center rounded-full border text-xs font-black ${index === 1 ? "border-[#E3172F] bg-[#E3172F]" : "border-[#555]"}`}
            >
              {index === 0 ? (
                <FontAwesomeIcon icon={faCheck} className="h-3" />
              ) : (
                index + 1
              )}
            </span>
            <strong
              className={`text-[9px] font-black uppercase ${index === 1 ? "text-[#F22A3D]" : "text-white"}`}
            >
              {label}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
