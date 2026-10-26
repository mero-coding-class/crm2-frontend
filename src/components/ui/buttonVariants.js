import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[8px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294998] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[#294998] text-white hover:bg-[#1e3776] active:bg-[#172b5c] shadow-xs",
        secondary:
          "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs",
        amber:
          "bg-[#e8a026] text-white hover:bg-[#d38e1a] active:bg-[#b8740c] shadow-xs",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        destructive:
          "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white",
        outline:
          "border border-[#cddbf6] text-[#294998] hover:bg-[#edf2fc]",
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
