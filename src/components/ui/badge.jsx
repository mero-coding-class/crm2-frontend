import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-xs font-600 leading-[14px] tracking-[0.04em] uppercase transition-colors border",
  {
    variants: {
      variant: {
        default: "bg-primary-light text-primary border-primary-border",
        brand: "bg-primary-light text-primary border-primary-border",
        amber: "bg-accent-light text-accent-dark border-accent-border",
        enrolled: "bg-emerald-50 text-emerald-700 border-emerald-200",
        pending: "bg-accent-light text-accent-dark border-accent-border",
        rejected: "bg-rose-50 text-rose-700 border-rose-200",
        inquiry: "bg-primary-light text-primary border-primary-border",
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
