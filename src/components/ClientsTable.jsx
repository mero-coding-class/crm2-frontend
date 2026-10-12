import React, { useState, useEffect, useRef } from "react";
import {
  Pencil,
  Trash2,
  GripVertical,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Building2,
  Check,
} from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- BACKGROUND COLORS FOR FIELDS ---
const FIELD_BG_CLASSES = {
  batch_name: "bg-purple-50 text-purple-900 border-purple-200",
  assigned_teacher: "bg-blue-50 text-blue-900 border-blue-200",
  course_duration: "bg-emerald-50 text-emerald-900 border-emerald-200",
};

// Format date display
const formatDisplayDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "N/A";
  }
};

// Resolve a field from enrollment first, then fallback to nested lead object
const resolveField = (student, key) => {
  if (!student) return "";
  const v = student[key];
  if (v !== undefined && v !== null) return v;
  if (student.lead && student.lead[key] !== undefined && student.lead[key] !== null)
    return student.lead[key];
  return "";
};

// Column toggler
const ColumnToggler = ({ columns, setColumns }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleColumn = (key) => {
    setColumns((prev) => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible },
    }));
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-slate-200 bg-white text-[13px] font-[500] text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
        <span>Columns</span>
      </button>

      {isDropdownOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-[10px] shadow-lg bg-white border border-slate-200 z-30 max-h-72 overflow-y-auto p-1.5">
          <div className="text-[11px] font-[600] text-slate-400 uppercase tracking-[0.04em] px-2.5 py-1">
            Toggle Columns
          </div>
          {Object.entries(columns).map(([key, { label, visible }]) => (
            <label
              key={key}
              className="flex items-center px-2.5 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 rounded-[6px] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={visible}
                onChange={() => toggleColumn(key)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-[#294998] focus:ring-[#294998] mr-2.5 cursor-pointer"
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// Editable text cell
const EditableTextCell = ({ value, field, onSave, cellClass = "" }) => {
  const safeValue = value == null ? "" : String(value);
  const [text, setText] = useState(safeValue);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const newSafeValue = value == null ? "" : String(value);
    setText(newSafeValue);
  }, [value]);

  const handleBlur = () => {
    if (editing) {
      setEditing(false);
      if (text !== value) {
        onSave(text);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    setEditing(true);
  };

  return (
    <td className={`px-3 py-2.5 whitespace-nowrap text-[13px] ${cellClass}`}>
      <input
        type="text"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`block w-full rounded-[6px] border border-slate-200 shadow-2xs focus:border-[#294998] focus:ring-2 focus:ring-[#294998]/15 text-[13px] text-slate-800 px-2 py-1 transition-all ${
          FIELD_BG_CLASSES[field] || "bg-white"
        }`}
      />
    </td>
  );
};

const ClientsTable = ({
  students = [],
  handleEdit,
  handleDelete,
  handleBulkDelete,
  onUpdatePaymentStatus,
  onUpdateField,
  courses = [],
  teachers = [],
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) => {
  const [orderedStudents, setOrderedStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [columns, setColumns] = useState({
    student_name: { label: "School Name", visible: true },
    parents_name: { label: "Principal", visible: true },
    email: { label: "Email", visible: true },
    phone_number: { label: "Phone", visible: true },
    whatsapp_number: { label: "WhatsApp", visible: false },
    grade: { label: "Grade", visible: false },
    source: { label: "Source", visible: false },
    class_type: { label: "Class Type", visible: false },
    shift: { label: "Shift", visible: false },
    device: { label: "Device", visible: false },
    previous_coding_experience: { label: "Prev Coding Exp", visible: false },
    course_name: { label: "Package", visible: true },
    batchname: { label: "Classes / Week", visible: true },
    assigned_teacher: { label: "Assigned Rep", visible: true },
    course_duration: { label: "MOU Period", visible: true },
    scheduled_taken: { label: "Demo Taken", visible: false },
    payment_type: { label: "Pricing Basis", visible: true },
    starting_date: { label: "MOU Start", visible: true },
    total_payment: { label: "Agreed Price", visible: true },
    first_installment: { label: "1st Installment", visible: false },
    second_installment: { label: "2nd Installment", visible: false },
    third_installment: { label: "3rd Installment", visible: false },
    last_pay_date: { label: "Last Pay Date", visible: true },
    next_pay_date: { label: "Next Pay Date", visible: true },
    payment_completed: { label: "Payment Status", visible: true },
    adset_name: { label: "Adset Name", visible: false },
    remarks: { label: "Remarks", visible: false },
    address_line_1: { label: "Address 1", visible: false },
    address_line_2: { label: "Address 2", visible: false },
    city: { label: "City", visible: false },
    county: { label: "County", visible: false },
    post_code: { label: "Post Code", visible: false },

    actions: { label: "Actions", visible: true },
    created_at: { label: "Enrollment Created", visible: false },
    updated_at: { label: "Enrollment Updated", visible: false },
  });

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    setOrderedStudents(students);
    setSelectedStudents(new Set());
  }, [students]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setOrderedStudents((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(orderedStudents.map((s) => s.id));
      setSelectedStudents(allIds);
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectRow = (studentId) => {
    setSelectedStudents((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(studentId)) newSelection.delete(studentId);
      else newSelection.add(studentId);
      return newSelection;
    });
  };

  const handleDeleteSelected = () => {
    handleBulkDelete([...selectedStudents]);
  };

  useEffect(() => {
    try {
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    } catch (e) {}
  }, [currentPage]);

  if (!students || students.length === 0) {
    return (
      <div className="py-16 text-center border border-slate-200 rounded-[12px] bg-white shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-[15px] font-[600] text-slate-900">No clients found</h3>
        <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">
          No clients match the current criteria. Adjust your search keywords or clear filters.
        </p>
      </div>
    );
  }

  const visibleKeys = Object.keys(columns).filter((k) => columns[k].visible);
  const orderedKeys = visibleKeys.includes("actions")
    ? ["actions", ...visibleKeys.filter((k) => k !== "actions")]
    : visibleKeys;

  return (
    <div className="border border-slate-200 rounded-[12px] bg-white shadow-2xs overflow-hidden">
      {/* Table Toolbar Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-3">
          {selectedStudents.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 text-[13px] font-[500] shadow-xs transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({selectedStudents.size})</span>
            </button>
          )}
          <span className="text-[12px] font-[500] text-slate-500">
            {orderedStudents.length} {orderedStudents.length === 1 ? "client" : "clients"} shown
          </span>
        </div>
        <ColumnToggler columns={columns} setColumns={setColumns} />
      </div>

      {/* Responsive Table Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto custom-scrollbar"
      >
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 w-8 text-center">
                  <span className="sr-only">Drag</span>
                </th>
                <th className="px-3 py-3 w-8 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      selectedStudents.size === orderedStudents.length &&
                      orderedStudents.length > 0
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#294998] focus:ring-[#294998] cursor-pointer"
                  />
                </th>
                {orderedKeys.map((key) => (
                  <th
                    key={key}
                    className={`px-3.5 py-3 text-[12px] font-[600] text-slate-500 uppercase tracking-[0.03em] ${
                      key === "actions" ? "text-right pr-4" : "text-left"
                    }`}
                  >
                    {columns[key].label}
                  </th>
                ))}
              </tr>
            </thead>
            <SortableContext
              items={orderedStudents.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody className="bg-white divide-y divide-slate-100">
                {orderedStudents.map((student) => (
                  <SortableStudentRow
                    key={student.id}
                    student={student}
                    columns={columns}
                    visibleKeys={orderedKeys}
                    isSelected={selectedStudents.has(student.id)}
                    onSelectRow={handleSelectRow}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    handlePaymentStatusChange={onUpdatePaymentStatus}
                    onUpdateField={onUpdateField}
                    courses={courses}
                    teachers={teachers}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </div>
  );
};

// Sortable row
const SortableStudentRow = ({
  student,
  columns,
  visibleKeys = [],
  isSelected,
  onSelectRow,
  handleEdit,
  handleDelete,
  handlePaymentStatusChange,
  onUpdateField,
  courses = [],
  teachers = [],
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: student.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-slate-50/70 border-b border-slate-100 transition-colors group ${
        isDragging ? "bg-[#EDF2FC]/70 shadow-md" : ""
      } ${isSelected ? "bg-[#EDF2FC]/40" : ""}`}
    >
      <td className="px-3 py-3 text-center">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400 p-0.5 rounded hover:bg-slate-100 transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-3 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelectRow(student.id)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-[#294998] focus:ring-[#294998] cursor-pointer"
        />
      </td>

      {visibleKeys.map((key) => {
        if (key.startsWith("lead_")) {
          const leadKey = key.replace("lead_", "");
          const val = student.lead ? student.lead[leadKey] : "";
          if (
            [
              "add_date",
              "last_call",
              "next_call",
              "created_at",
              "updated_at",
            ].includes(leadKey)
          ) {
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
                <input
                  type="date"
                  value={val ? val.split("T")[0] : ""}
                  onChange={(e) =>
                    onUpdateField(student.id, `lead.${leadKey}`, e.target.value)
                  }
                  className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                />
              </td>
            );
          }
          if (leadKey === "status") {
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
                <select
                  value={val || "Active"}
                  onChange={(e) =>
                    onUpdateField(student.id, `lead.${leadKey}`, e.target.value)
                  }
                  className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 bg-white focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                >
                  {["Active", "Converted", "Lost"].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </td>
            );
          }
          if (leadKey === "substatus") {
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
                <select
                  value={val || "New"}
                  onChange={(e) =>
                    onUpdateField(student.id, `lead.${leadKey}`, e.target.value)
                  }
                  className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 bg-white focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                >
                  {[
                    "New",
                    "Open",
                    "Followup",
                    "inProgress",
                    "Average",
                    "Interested",
                    "Junk",
                  ].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </td>
            );
          }
          if (leadKey === "scheduled_taken" || leadKey === "demo_scheduled") {
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
                <select
                  value={val || ""}
                  onChange={(e) =>
                    onUpdateField(
                      student.id,
                      `lead.${
                        leadKey === "demo_scheduled"
                          ? "demo_scheduled"
                          : "scheduled_taken"
                      }`,
                      e.target.value
                    )
                  }
                  className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 bg-white focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
            );
          }
          return (
            <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
              <input
                type="text"
                value={val}
                onChange={(e) =>
                  onUpdateField(student.id, `lead.${leadKey}`, e.target.value)
                }
                className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
              />
            </td>
          );
        }

        switch (key) {
          case "student_name":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap">
                <div className="font-[600] text-[13px] text-slate-900">
                  {student.student_name ||
                    (student.lead && student.lead.student_name) ||
                    "N/A"}
                </div>
              </td>
            );
          case "parents_name":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
                {student.parents_name ||
                  (student.lead && student.lead.parents_name) ||
                  "—"}
              </td>
            );
          case "email":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-600">
                {student.email || (student.lead && student.lead.email) || "—"}
              </td>
            );
          case "phone_number":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-600">
                {student.phone_number ||
                  (student.lead && student.lead.phone_number) ||
                  "—"}
              </td>
            );
          case "course_name": {
            const courseDisplay = (() => {
              if (student.course_name) return student.course_name;
              const c = student.course;
              if (c !== undefined && c !== null) {
                if (typeof c === "number" || typeof c === "string") {
                  const found = courses.find(
                    (co) => String(co.id) === String(c)
                  );
                  if (found && (found.course_name || found.name))
                    return found.course_name || found.name;
                  if (typeof c === "string") return c;
                }
                if (typeof c === "object") {
                  return (
                    c.course_name || c.name || String(c.id || JSON.stringify(c))
                  );
                }
              }
              if (student.lead && student.lead.course_name)
                return student.lead.course_name;
              return "";
            })();
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[12px] font-[500] bg-slate-100 text-slate-800 border border-slate-200">
                  {courseDisplay || "N/A"}
                </span>
              </td>
            );
          }
          case "batchname":
            return (
              <EditableTextCell
                key={key}
                field={key}
                cellClass="min-w-[130px]"
                value={student[key] ?? (student.lead ? student.lead[key] : "")}
                onSave={(v) => onUpdateField(student.id, key, v)}
              />
            );
          case "assigned_teacher": {
            const currentId = student.assigned_teacher;
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700 min-w-[160px]">
                <select
                  value={currentId || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value || null;
                    if (selectedId) {
                      const match = teachers.find(
                        (t) => String(t.id) === String(selectedId)
                      );
                      onUpdateField(student.id, "assigned_teacher", {
                        id: selectedId,
                        name: match ? match.name : undefined,
                      });
                    } else {
                      onUpdateField(student.id, "assigned_teacher", null);
                    }
                  }}
                  className="block w-full rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 bg-white focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                >
                  <option value="">-- None --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </td>
            );
          }
          case "course_duration":
            return (
              <EditableTextCell
                key={key}
                field={key}
                value={student[key] ?? (student.lead ? student.lead[key] : "")}
                onSave={(v) => onUpdateField(student.id, key, v)}
              />
            );
          case "last_pay_date":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
                <input
                  type="date"
                  value={
                    student.last_pay_date
                      ? student.last_pay_date.split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    onUpdateField(student.id, "last_pay_date", e.target.value)
                  }
                  className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                />
              </td>
            );
          case "next_pay_date":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
                <input
                  type="date"
                  value={
                    student.next_pay_date
                      ? student.next_pay_date.split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    onUpdateField(student.id, "next_pay_date", e.target.value)
                  }
                  className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                />
              </td>
            );
          case "course":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
                <select
                  value={student.course || ""}
                  onChange={(e) =>
                    onUpdateField(student.id, "course", e.target.value)
                  }
                  className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 bg-white focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_name || c.name}
                    </option>
                  ))}
                </select>
              </td>
            );
          case "total_payment":
            return (
              <EditableTextCell
                key={key}
                field={key}
                value={student.total_payment || ""}
                onSave={(v) => onUpdateField(student.id, "total_payment", v)}
              />
            );
          case "first_installment":
          case "second_installment":
          case "third_installment":
            return (
              <EditableTextCell
                key={key}
                field={key}
                value={student[key] || ""}
                onSave={(v) => onUpdateField(student.id, key, v)}
              />
            );
          case "starting_date":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
                <input
                  type="date"
                  value={student.starting_date || ""}
                  onChange={(e) =>
                    onUpdateField(student.id, "starting_date", e.target.value)
                  }
                  className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                />
              </td>
            );
          case "payment_completed":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px]">
                <select
                  value={student.payment_completed ? "Yes" : "No"}
                  onChange={(e) => {
                    const newValue = e.target.value === "Yes";
                    handlePaymentStatusChange(student.id, newValue);
                    onUpdateField(student.id, "payment_completed", newValue);
                  }}
                  className={`text-[12px] font-[600] rounded-full px-2.5 py-0.5 border cursor-pointer focus:outline-none transition-colors ${
                    student.payment_completed
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  <option value="Yes">✓ Completed</option>
                  <option value="No">⏳ Pending</option>
                </select>
              </td>
            );
          case "actions":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleEdit(student)}
                    title="Edit client details"
                    className="p-1.5 rounded-[6px] text-slate-400 hover:text-[#294998] hover:bg-[#EDF2FC] transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    title="Delete client"
                    className="p-1.5 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            );
          case "scheduled_taken":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700 min-w-[100px]">
                <select
                  value={
                    resolveField(student, "scheduled_taken") ||
                    resolveField(student, "demo_scheduled") ||
                    ""
                  }
                  onChange={(e) =>
                    onUpdateField(
                      student.id,
                      `lead.scheduled_taken`,
                      e.target.value
                    )
                  }
                  className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 bg-white focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
            );
          case "payment_type":
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700 min-w-[120px]">
                <select
                  value={resolveField(student, "payment_type") || ""}
                  onChange={(e) =>
                    onUpdateField(student.id, "payment_type", e.target.value)
                  }
                  className="rounded-[6px] border border-slate-200 text-[13px] px-2 py-1 bg-white focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998]"
                >
                  <option value="">Select</option>
                  <option value="Cash">Cash</option>
                  <option value="Office QR">Office QR</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </td>
            );
          default:
            return (
              <td key={key} className="px-3.5 py-3 whitespace-nowrap text-[13px] text-slate-700">
                {String(resolveField(student, key) ?? "")}
              </td>
            );
        }
      })}
    </tr>
  );
};

export default ClientsTable;
