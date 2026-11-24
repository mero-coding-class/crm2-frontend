import React from "react";
import { cn } from "../../lib/utils.js";

export function PageShell({ as: Element = "div", width = "full", children, className = "" }) {
  const widthClass = {
    full: "w-full",
    standard: "mx-auto w-full max-w-7xl",
    wide: "mx-auto w-full max-w-screen-2xl",
  }[width] || "w-full";
  return <Element className={cn("crm-page-shell", widthClass, className)}>{children}</Element>;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className = "",
}) {
  return (
    <header className={cn("flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 lg:flex-row lg:items-start lg:justify-between", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="crm-page-title">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
