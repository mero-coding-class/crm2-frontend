import * as React from "react";
import { cn } from "../../lib/utils";

const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full appearance-none rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 cursor-pointer transition-colors",
      "focus-visible:outline-none focus-visible:border-[#294998] focus-visible:ring-[3px] focus-visible:ring-[#294998]/15",
      "hover:border-slate-300",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors resize-none",
      "focus-visible:outline-none focus-visible:border-[#294998] focus-visible:ring-[3px] focus-visible:ring-[#294998]/15",
      "hover:border-slate-300",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Select, Textarea };
