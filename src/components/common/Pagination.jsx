import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button.jsx";

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  disabled = false,
  summary = null,
}) {
  const pageCount = Math.max(1, Number(totalPages) || 1);
  const page = Math.min(Math.max(1, Number(currentPage) || 1), pageCount);

  return (
    <nav className="crm-pagination" aria-label="Pagination">
      <div className="text-sm text-slate-500">{summary || `Page ${page} of ${pageCount}`}</div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPageChange?.(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="min-w-24 rounded-md bg-slate-50 px-3 py-1.5 text-center text-sm font-medium text-slate-700">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPageChange?.(page + 1)}
          disabled={disabled || page >= pageCount}
          aria-label="Next page"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
