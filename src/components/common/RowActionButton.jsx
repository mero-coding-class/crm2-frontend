import React from "react";

const TONE_CLASSES = {
  default: "text-slate-400 hover:bg-primary-light hover:text-primary",
  danger: "text-slate-400 hover:bg-rose-50 hover:text-rose-600",
};

/** Shared icon-only row action (View/Edit/Delete-equivalents) so every
 * data table uses the same size, spacing and hover styling. */
export default function RowActionButton({
  icon: Icon,
  label,
  onClick,
  tone = "default",
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${TONE_CLASSES[tone]} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
