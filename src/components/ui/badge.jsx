import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] font-600 leading-[14px] tracking-[0.04em] uppercase transition-colors border",
  {
    variants: {
      variant: {
        default: "bg-indigo-50 text-indigo-700 border-indigo-200",
        enrolled: "bg-emerald-50 text-emerald-700 border-emerald-200",
        pending: "bg-amber-50 text-amber-700 border-amber-200",
        rejected: "bg-rose-50 text-rose-700 border-rose-200",
        inquiry: "bg-sky-50 text-sky-700 border-sky-200",
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

export { Badge, badgeVariants };
