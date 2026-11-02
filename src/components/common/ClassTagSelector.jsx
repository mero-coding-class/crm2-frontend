import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function ClassTagSelector({
  options = [],
  selectedValues = [],
  onChange,
  disabled = false,
  ariaLabel = "Classes",
}) {
  const selected = new Set(selectedValues.map((value) => String(value)));

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50"
    >
      {options.map((option) => {
        const value = option.value ?? option.id;
        const label = option.label ?? option.class_name ?? option.name ?? String(value);
        const isSelected = selected.has(String(value));
        return (
          <button
            key={value}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onChange?.(
              isSelected
                ? selectedValues.filter((item) => String(item) !== String(value))
                : [...selectedValues, value]
            )}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isSelected
                ? "bg-primary text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {isSelected && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
            <span className="capitalize">{label}</span>
          </button>
        );
      })}
      {!options.length && <span className="text-xs text-slate-500">No classes available.</span>}
    </div>
  );
}
