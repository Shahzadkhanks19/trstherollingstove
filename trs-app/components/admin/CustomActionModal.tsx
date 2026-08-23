"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";

export type CustomActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
  initialValue?: string;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
};

type CustomActionModalContentProps = Omit<CustomActionModalProps, "open">;

function CustomActionModalContent({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  inputLabel,
  inputPlaceholder,
  inputRequired = false,
  initialValue = "",
  onClose,
  onConfirm,
}: CustomActionModalContentProps) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isBusy = loading || submitting;
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (inputLabel) inputRef.current?.focus();
      else confirmButtonRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [inputLabel]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusy) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, onClose]);

  async function submit() {
    if (isBusy) return;
    const cleanValue = value.trim();
    if (inputRequired && !cleanValue) {
      setValidationError(`${inputLabel ?? "This field"} is required.`);
      inputRef.current?.focus();
      return;
    }

    setValidationError("");
    setSubmitting(true);
    try {
      await onConfirm(cleanValue);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[180] grid place-items-end bg-black/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose();
      }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-action-modal-title"
        aria-describedby="custom-action-modal-description"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 27, stiffness: 300 }}
        className="w-full overflow-hidden rounded-t-[28px] border border-[#eadfd5] bg-[#fffdf9] shadow-2xl sm:max-w-md sm:rounded-[28px]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eee4dc] px-5 py-4">
          <div className="flex min-w-0 gap-3">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                tone === "danger"
                  ? "bg-red-50 text-red-700"
                  : "bg-[#fff0e8] text-[#C8102E]"
              }`}
            >
              <FontAwesomeIcon icon={faCircleExclamation} />
            </span>
            <div className="min-w-0">
              <h2
                id="custom-action-modal-title"
                className="text-lg font-black text-[#173044]"
              >
                {title}
              </h2>
              <p
                id="custom-action-modal-description"
                className="mt-1 text-sm leading-5 text-[#756960]"
              >
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            disabled={isBusy}
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e5d9cf] bg-white text-[#173044] disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        {inputLabel && (
          <div className="px-5 pt-5">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-[#756960]">
                {inputLabel}
              </span>
              <textarea
                ref={inputRef}
                value={value}
                maxLength={500}
                rows={4}
                disabled={isBusy}
                placeholder={inputPlaceholder}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (validationError) setValidationError("");
                }}
                className="w-full resize-none rounded-2xl border border-[#e1d6cd] bg-white px-4 py-3 text-sm font-semibold text-[#173044] outline-none focus:border-[#C8102E] disabled:opacity-60"
              />
              {validationError && (
                <span
                  role="alert"
                  className="mt-1 block text-xs font-semibold text-red-700"
                >
                  {validationError}
                </span>
              )}
            </label>
          </div>
        )}

        <footer className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="min-h-11 rounded-xl border border-[#ded3ca] bg-white px-5 text-xs font-black text-[#173044] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            disabled={isBusy}
            onClick={() => void submit()}
            className={`min-h-11 rounded-xl px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              tone === "danger" ? "bg-red-700" : "bg-[#173044]"
            }`}
          >
            {isBusy ? "Please wait…" : confirmLabel}
          </button>
        </footer>
      </motion.section>
    </motion.div>
  );
}

export function CustomActionModal({
  open,
  ...contentProps
}: CustomActionModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <CustomActionModalContent
          key={`${contentProps.title}:${contentProps.initialValue ?? ""}`}
          {...contentProps}
        />
      )}
    </AnimatePresence>
  );
}
