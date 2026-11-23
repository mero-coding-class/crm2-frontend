import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
  backTo,
  backLabel = "Dashboard",
  className = "",
}) {
  return (
    <header className={cn("flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 lg:flex-row lg:items-start lg:justify-between", className)}>
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {backLabel}
          </Link>
        )}
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
