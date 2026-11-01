import React from "react";
import { cn } from "../../lib/utils.js";

export default function DataTableShell({
  children,
  density = "standard",
  minWidth = "auto",
  className = "",
  pagination = null,
}) {
  return (
    <div
      className={cn("crm-data-table", `crm-data-table--${density}`, className)}
      style={{ "--crm-table-min-width": minWidth }}
    >
      {children}
      {pagination}
    </div>
  );
}
