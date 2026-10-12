// src/components/TrashTableDisplay.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  TrashIcon,
  ArrowUturnLeftIcon,
  Bars3Icon,
  Cog6ToothIcon,
  ChevronLeftIcon, // New for pagination
  ChevronRightIcon, // New for pagination
} from "@heroicons/react/24/outline";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Menu } from "@headlessui/react";

// Helper function to safely format date for input type="date"
const getFormattedDate = (dateString) => {
  try {
    if (!dateString || dateString === "N/A") return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(
        "TrashTableDisplay: Invalid date string received for date input (will be empty):",
        dateString
      );
      return "";
    }
    return date.toISOString().split("T")[0]; // Format to YYYY-MM-DD
  } catch (error) {
    console.error(
      "Error formatting date in TrashTableDisplay:",
      error,
      "Original string:",
      dateString
    );
    return "";
  }
};

const formatLogTimestamp = (isoString) => {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    return date.toLocaleString(); // Formats to a human-readable local date/time
  } catch {
    return isoString; // Fallback to original string if invalid
  }
};

// (role badge classes removed with deletion log UI)

const ColumnToggler = ({ columns, setColumns }) => {
  const toggleColumn = (key) => {
    setColumns((prev) => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible },
    }));
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#294998]">
          <Cog6ToothIcon className="h-5 w-5 mr-2" />
          Columns
        </Menu.Button>
      </div>
      <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10 max-h-60 overflow-y-auto">
        <div className="py-1">
          {Object.entries(columns).map(([key, { label, visible }]) => (
            <Menu.Item key={key}>
              {({ active }) => (
                <label
                  className={`${
                    active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                  } flex items-center px-4 py-2 text-sm cursor-pointer`}
                >
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() => toggleColumn(key)}
                    className="h-4 w-4 rounded border-gray-300 text-[#294998] focus:ring-[#294998] mr-3"
                  />
                  {label}
                </label>
              )}
            </Menu.Item>
          ))}
        </div>
      </Menu.Items>
    </Menu>
  );
};

const TrashTableDisplay = ({
  leads,
  onPermanentDelete,
  onRestoreLead,
  onBulkRestore,
  onBulkPermanentDelete,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const [orderedLeads, setOrderedLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const leadsPerPage = 20;

  useEffect(() => {
    setOrderedLeads(leads || []);
    setSelectedLeads(new Set());
    // do not force page change here; parent controls page
  }, [leads]);

  const [columns, setColumns] = useState({
    actions: { label: "Actions", visible: true },
    id: { label: "ID", visible: true },
    student_name: { label: "Student Name", visible: true },
    parents_name: { label: "Parents' Name", visible: true },
    email: { label: "Email", visible: false },
    phone_number: { label: "Phone", visible: false },
    whatsapp_number: { label: "WhatsApp", visible: true },
    age: { label: "Age", visible: false },
    grade: { label: "Grade", visible: false },
    source: { label: "Source", visible: true },
    course_name: { label: "Course", visible: true },
    course: { label: "Course ID", visible: false },
    class_type: { label: "Class Type", visible: true },
    shift: { label: "Shift", visible: true },
    previous_coding_experience: { label: "Prev Coding Exp", visible: false },
    last_call: { label: "Last Call", visible: false },
    next_call: { label: "Next Call", visible: true },
    device: { label: "Device", visible: false },
    status: { label: "Status", visible: true },
    remarks: { label: "Remarks", visible: true },
    created_at: { label: "Created At", visible: false },
    updated_at: { label: "Updated At", visible: false },
  });

  /* ---------------------- HORIZONTAL SCROLL LOGIC ----------------------- */
  const tableContainerRef = useRef(null);
  const scrollIntervalRef = useRef(null);

  const smoothScroll = (distance) => {
    if (!tableContainerRef.current) return;
    tableContainerRef.current.scrollBy({ left: distance, behavior: "smooth" });
  };

  const handleMouseMove = useCallback((e) => {
    const container = tableContainerRef.current;
    if (!container) return;

    const { clientX } = e;
    const { left, right } = container.getBoundingClientRect();
    const scrollSpeed = 10;
    const edgeThreshold = 50;

    if (clientX < left + edgeThreshold) {
      if (scrollIntervalRef.current) return;
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft -= scrollSpeed;
      }, 20);
    } else if (clientX > right - edgeThreshold) {
      if (scrollIntervalRef.current) return;
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft += scrollSpeed;
      }, 20);
    } else {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearInterval(scrollIntervalRef.current);
    scrollIntervalRef.current = null;
  }, []);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      clearInterval(scrollIntervalRef.current);
    };
  }, [handleMouseMove, handleMouseLeave]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setOrderedLeads((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSelectAll = (e) => {
    const currentLeads = orderedLeads;
    if (e.target.checked) {
      const allLeadIds = new Set(currentLeads.map((lead) => lead.id));
      setSelectedLeads((prev) => new Set([...prev, ...allLeadIds]));
    } else {
      const newSelection = new Set(selectedLeads);
      currentLeads.forEach((lead) => newSelection.delete(lead.id));
      setSelectedLeads(newSelection);
    }
  };

  const handleSelectRow = (leadId) => {
    setSelectedLeads((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(leadId)) {
        newSelection.delete(leadId);
      } else {
        newSelection.add(leadId);
      }
      return newSelection;
    });
  };

  const handleRestoreSelected = () => {
    onBulkRestore([...selectedLeads]);
    setSelectedLeads(new Set());
  };

  const handleDeleteSelected = () => {
    onBulkPermanentDelete([...selectedLeads]);
    setSelectedLeads(new Set());
  };

  /* -------------------------- PAGINATION LOGIC -------------------------- */
  // When backend provides paginated data, `leads` should already be the current page
  const currentLeads = orderedLeads;

  // Ensure table scrolls to top when page changes
  useEffect(() => {
    try {
      if (tableContainerRef.current) tableContainerRef.current.scrollTop = 0;
    } catch (e) {}
  }, [currentPage]);

  const handlePageChange = (pageNumber) => {
    if (
      pageNumber > 0 &&
      pageNumber <= totalPages &&
      typeof onPageChange === "function"
    ) {
      onPageChange(pageNumber);
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  if (!leads || leads.length === 0) {
    return (
      <p className="text-center text-gray-600 py-8">No trashed leads found.</p>
    );
  }

  return (
    <div>
      {/* This container will align its children to the left and right sides */}
      <div className="flex justify-between items-center mb-4">
        {/* Container for the selected buttons, aligned to the left */}
        <div className="flex space-x-2">
          {selectedLeads.size > 0 && (
            <>
              <button
                onClick={handleRestoreSelected}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
              >
                <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />
                Restore Selected ({selectedLeads.size})
              </button>
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
              >
                <TrashIcon className="h-5 w-5 mr-2" />
                Delete Selected ({selectedLeads.size})
              </button>
            </>
          )}
        </div>

        <ColumnToggler columns={columns} setColumns={setColumns} />
      </div>

      <div className="overflow-x-auto" ref={tableContainerRef}>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <span className="sr-only">Drag</span>
                  </th>
                  <th className="px-3 py-3 w-10">
                    {(() => {
                      const allSelected =
                        currentLeads.length > 0 &&
                        currentLeads.every((lead) =>
                          selectedLeads.has(lead.id)
                        );
                      const someSelected = currentLeads.some((lead) =>
                        selectedLeads.has(lead.id)
                      );
                      const isIndeterminate = someSelected && !allSelected;
                      return (
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isIndeterminate;
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-[#294998] focus:ring-[#294998]"
                        />
                      );
                    })()}
                  </th>
                  {Object.entries(columns).map(([key, { label, visible }]) =>
                    visible ? (
                      <th
                        key={key}
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {label}
                      </th>
                    ) : null
                  )}
                </tr>
              </thead>
              <SortableContext
                items={orderedLeads.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentLeads.map((lead) => (
                    <SortableTrashRow
                      key={lead.id}
                      lead={lead}
                      columns={columns}
                      isSelected={selectedLeads.has(lead.id)}
                      onSelectRow={handleSelectRow}
                      onPermanentDelete={onPermanentDelete}
                      onRestoreLead={onRestoreLead}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>

      {/* Pagination */}
      <div className="flex justify-end items-center mt-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <span className="mx-4 text-sm font-medium text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>
    </div>
  );
};

const SortableTrashRow = ({
  lead,
  columns,
  isSelected,
  onSelectRow,
  onPermanentDelete,
  onRestoreLead,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
  };

  // Render cell content based on the column key
  const renderCellContent = (key) => {
    switch (key) {
      case "id":
        return lead.id;
      case "student_name":
        return lead.student_name;
      case "parents_name":
        return lead.parents_name || "N/A";
      case "email":
        return lead.email;
      case "phone_number":
        return lead.phone_number;
      case "whatsapp_number":
        return lead.whatsapp_number;
      case "age":
        return lead.age || "N/A";
      case "grade":
        return lead.grade || "N/A";
      case "source":
        return lead.source;
      case "course_name":
        return lead.course_name;
      case "course":
        return lead.course != null ? String(lead.course) : "N/A";
      case "class_type":
        return lead.class_type || "N/A";
      case "shift":
        return lead.shift || "N/A";
      case "previous_coding_experience":
        return lead.previous_coding_experience || "N/A";
      case "last_call":
        return getFormattedDate(lead.last_call) || "N/A";
      case "next_call":
        return getFormattedDate(lead.next_call) || "N/A";
      case "device":
        return lead.device || "N/A";
      case "status":
        return lead.status || "N/A";
      case "remarks":
        return lead.remarks || "—";
      case "created_at":
        return formatLogTimestamp(lead.created_at) || "N/A";
      case "updated_at":
        return formatLogTimestamp(lead.updated_at) || "N/A";
      default:
        return "";
    }
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50 ${
        isDragging ? "bg-gray-100 shadow-lg" : ""
      }`}
    >
      <td className="px-3 py-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <Bars3Icon className="h-5 w-5 text-gray-400" />
        </button>
      </td>
      <td className="px-3 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelectRow(lead.id)}
          className="h-4 w-4 rounded border-gray-300 text-[#294998] focus:ring-[#294998]"
        />
      </td>
      {columns.actions.visible && (
        <td className="px-3 py-4 whitespace-nowrap text-left text-sm font-medium">
          <button
            onClick={() => onRestoreLead(lead.id)}
            className="text-green-600 hover:text-green-900 mr-2 p-1 rounded-md hover:bg-green-50 transition-colors"
            title="Restore Lead"
          >
            <ArrowUturnLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onPermanentDelete(lead.id)}
            className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
            title="Permanently Delete"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </td>
      )}
      {Object.entries(columns).map(([key, { visible }]) => {
        if (key === "actions" || !visible) return null;
        const isName = key === "student_name";
        const isRemarks = key === "remarks";
        const baseClass = isName
          ? "px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
          : "px-3 py-4 whitespace-nowrap text-sm text-gray-700";
        const className = isRemarks
          ? `${baseClass} max-w-xs truncate`
          : baseClass;
        const title = isRemarks ? lead.remarks || "" : undefined;
        return (
          <td key={key} className={className} title={title}>
            {renderCellContent(key)}
          </td>
        );
      })}
    </tr>
  );
};

export default TrashTableDisplay;
