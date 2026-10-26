import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] font-600 leading-[14px] tracking-[0.04em] uppercase transition-colors border",
  {
    variants: {
      variant: {
        default: "bg-[#edf2fc] text-[#294998] border-[#cddbf6]",
        brand: "bg-[#edf2fc] text-[#294998] border-[#cddbf6]",
        amber: "bg-[#fef7eb] text-[#b8740c] border-[#fad99a]",
        enrolled: "bg-emerald-50 text-emerald-700 border-emerald-200",
        pending: "bg-[#fef7eb] text-[#b8740c] border-[#fad99a]",
        rejected: "bg-rose-50 text-rose-700 border-rose-200",
        inquiry: "bg-[#edf2fc] text-[#294998] border-[#cddbf6]",
        secondary: "bg-slate-100 text-slate-600 border-slate-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
