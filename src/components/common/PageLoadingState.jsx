import React from "react";
import { LoaderCircle } from "lucide-react";

const PageLoadingState = () => (
  <div
    role="status"
    aria-live="polite"
    className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-[#F8FAFC] px-6"
  >
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm">
        <img src="/merocoding-logo.png" alt="" className="h-7 w-7 object-contain" />
        <LoaderCircle
          aria-hidden="true"
          className="absolute -inset-1 h-14 w-14 animate-spin text-[#294998]"
          strokeWidth={1.5}
        />
      </div>
      <p className="text-sm font-medium text-slate-500">Loading...</p>
    </div>
  </div>
);

export default PageLoadingState;
