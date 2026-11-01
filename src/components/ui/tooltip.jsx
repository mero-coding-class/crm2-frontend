import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-[6px] bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md crm-animate-in crm-fade-in-0 crm-zoom-in-95 data-[state=closed]:crm-animate-out data-[state=closed]:crm-fade-out-0 data-[state=closed]:crm-zoom-out-95 data-[side=bottom]:crm-slide-in-from-top-2 data-[side=left]:crm-slide-in-from-right-2 data-[side=right]:crm-slide-in-from-left-2 data-[side=top]:crm-slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
