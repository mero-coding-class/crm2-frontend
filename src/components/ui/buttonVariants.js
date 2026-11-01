import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[8px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white hover:bg-primary-hover active:bg-primary-dark shadow-xs",
        secondary:
          "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs",
        amber:
          "bg-accent text-white hover:bg-accent-hover active:bg-accent-dark shadow-xs",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        destructive:
          "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white",
        "outline-destructive":
          "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
        restore:
          "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        refresh:
          "border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50",
        outline:
          "border border-primary-border text-primary hover:bg-primary-light",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);
