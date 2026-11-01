// src/components/ColumnToggler.jsx
import React from "react";
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

const ColumnToggler = ({ columns, setColumns, canManage = true }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <SlidersHorizontal className="h-4 w-4 text-slate-500" />
        Columns
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 max-h-72 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          {Object.entries(columns)
            .filter(([key]) => canManage || key !== "actions")
            .map(([key, column]) => (
              <label key={key} className="flex cursor-pointer items-center rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={() => setColumns((previous) => ({
                    ...previous,
                    [key]: { ...previous[key], visible: !previous[key].visible },
                  }))}
                  className="mr-2.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                {column.label}
              </label>
            ))}
        </div>
      )}
    </div>
  );
};

export default ColumnToggler;
