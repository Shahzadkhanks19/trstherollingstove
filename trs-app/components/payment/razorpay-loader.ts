const RAZORPAY_SCRIPT_SELECTOR = 'script[data-trs-razorpay="true"]';
const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const LOAD_ERROR = "Razorpay checkout could not be loaded.";

export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    RAZORPAY_SCRIPT_SELECTOR,
  );

  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(LOAD_ERROR)),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.dataset.trsRazorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(LOAD_ERROR));
    document.head.appendChild(script);
  });
}
