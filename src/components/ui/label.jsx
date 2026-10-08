import * as React from "react";
import { cn } from "../../lib/utils";

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-[14px] font-[500] leading-[20px] text-slate-700 cursor-pointer",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
