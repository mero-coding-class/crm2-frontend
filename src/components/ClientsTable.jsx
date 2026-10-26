import React, { useEffect, useRef, useState } from "react";
import { Building2, GripVertical, Pencil, SlidersHorizontal, Undo2 } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DEFAULT_COLUMNS = {
  system_id: { label: "System ID", visible: true },
  school_name: { label: "School", visible: true },
  principal_name: { label: "Principal Name", visible: true },
  principal_email: { label: "Principal Email", visible: false },
  principal_number: { label: "Principal Phone", visible: false },
  contact_name: { label: "Contact", visible: false },
  contact_number: { label: "Contact Phone", visible: true },
  contact_email: { label: "Contact Email", visible: true },
  package_name: { label: "Package", visible: true },
  classes_per_week: { label: "Classes / Week", visible: true },
  assigned_to: { label: "Academic User", visible: true },
  mou_start: { label: "MOU Start", visible: true },
  mou_end: { label: "MOU End", visible: true },
  pricing_basis: { label: "Pricing Basis", visible: true },
  agreed_price: { label: "Agreed Price", visible: true },
  actions: { label: "Actions", visible: true },
};

const ColumnToggler = ({ columns, setColumns, canManage }) => {
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-slate-200 bg-white text-[13px] font-[500] text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
        <span>Columns</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 max-h-72 w-56 overflow-y-auto rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-lg">
          {Object.entries(columns)
            .filter(([key]) => canManage || key !== "actions")
            .map(([key, column]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center rounded-[6px] px-2.5 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={column.visible}
                onChange={() =>
                  setColumns((previous) => ({
                    ...previous,
                    [key]: { ...previous[key], visible: !previous[key].visible },
                  }))
                }
                className="mr-2.5 h-3.5 w-3.5 rounded border-slate-300 text-[#294998] focus:ring-[#294998]"
              />
              {column.label}
            </label>
            ))}
        </div>
      )}
    </div>
  );
};

const ClientsTable = ({
  students = [],
  handleEdit,
  handleDelete,
  handleBulkDelete,
  teachers = [],
  canManage = false,
  canAssignAcademic = false,
  assigningClientId = null,
  onAssignAcademic,
}) => {
  const [orderedStudents, setOrderedStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [columns, setColumns] = useState(() => ({
    ...DEFAULT_COLUMNS,
    actions: { ...DEFAULT_COLUMNS.actions, visible: canManage },
  }));

  useEffect(() => {
    setColumns((previous) => ({
      ...previous,
      actions: { ...previous.actions, visible: canManage },
    }));
  }, [canManage]);

  useEffect(() => {
    setOrderedStudents(students);
    setSelectedStudents(new Set());
  }, [students]);

  const handleDragEnd = ({ active, over }) => {
    if (!active || !over || active.id === over.id) return;
    setOrderedStudents((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const visibleColumns = Object.keys(columns).filter((key) => columns[key].visible);

  if (!students.length) {
    return (
      <div className="rounded-[12px] border border-slate-200 bg-white py-16 text-center shadow-2xs">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Building2 className="h-6 w-6" />
        </div>
        <h3 className="text-[15px] font-[600] text-slate-900">No clients found</h3>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">
          No clients match this search.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
        <div className="flex items-center gap-3">
          {canManage && selectedStudents.size > 0 && (
            <button
              type="button"
              onClick={() => handleBulkDelete([...selectedStudents])}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-rose-600 px-3 py-1.5 text-[13px] font-[500] text-white shadow-xs transition-colors hover:bg-rose-700"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Return to Leads ({selectedStudents.size})
            </button>
          )}
          <span className="text-[12px] font-[500] text-slate-500">
            {orderedStudents.length} {orderedStudents.length === 1 ? "client" : "clients"} on this page
          </span>
        </div>
        <ColumnToggler columns={columns} setColumns={setColumns} canManage={canManage} />
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full min-w-[1500px] table-fixed divide-y divide-slate-200 text-left">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="w-7 px-1.5 py-2"><span className="sr-only">Reorder</span></th>
                <th className="w-7 px-1.5 py-2 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all clients on this page"
                    checked={selectedStudents.size === orderedStudents.length && orderedStudents.length > 0}
                    onChange={(event) =>
                      setSelectedStudents(
                        event.target.checked
                          ? new Set(orderedStudents.map((student) => student.id))
                          : new Set()
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#294998] focus:ring-[#294998]"
                  />
                </th>
                {visibleColumns.map((key) => (
                  <th
                    key={key}
                    title={columns[key].label}
                    className={`overflow-hidden text-ellipsis px-1.5 py-2 text-left whitespace-nowrap text-[11px] font-[600] uppercase tracking-[0.02em] text-slate-500 ${
                      key === "principal_name"
                        ? "w-[200px] min-w-[200px]"
                        : key === "contact_number"
                          ? "w-[150px] min-w-[150px]"
                          : key === "contact_email"
                            ? "w-[190px] min-w-[190px]"
                            : ""
                    }`}
                  >
                    {columns[key].label}
                  </th>
                ))}
              </tr>
            </thead>
            <SortableContext items={orderedStudents.map((student) => student.id)} strategy={verticalListSortingStrategy}>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orderedStudents.map((student) => (
                  <SortableClientRow
                    key={student.id}
                    student={student}
                    visibleColumns={visibleColumns}
                    isSelected={selectedStudents.has(student.id)}
                    onSelect={() =>
                      setSelectedStudents((selected) => {
                        const next = new Set(selected);
                        if (next.has(student.id)) next.delete(student.id);
                        else next.add(student.id);
                        return next;
                      })
                    }
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    teachers={teachers}
                    canManage={canManage}
                    canAssignAcademic={canAssignAcademic}
                    assigningClientId={assigningClientId}
                    onAssignAcademic={onAssignAcademic}
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

const SortableClientRow = ({
  student,
  visibleColumns,
  isSelected,
  onSelect,
  handleEdit,
  handleDelete,
  teachers,
  canManage,
  canAssignAcademic,
  assigningClientId,
  onAssignAcademic,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: student.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
  };

  const renderCell = (field) => {
    switch (field) {
      case "system_id":
        return <span title={student.system_id || "—"}>{student.system_id || "—"}</span>;
      case "school_name":
        return <span title={student.school_name || "—"} className="font-[600] text-slate-900">{student.school_name || "—"}</span>;
      case "assigned_to": {
        const assignedId = student.assigned_to?.id ?? student.assigned_to;
        const assignedName = student.assigned_to_name ||
          teachers.find((teacher) => String(teacher.id) === String(assignedId))?.name;
        if (canAssignAcademic) {
          const hasCurrentTeacher = teachers.some(
            (teacher) => String(teacher.id) === String(assignedId)
          );
          return (
            <select
              aria-label={`Academic user for ${student.school_name || "client"}`}
              value={assignedId ?? ""}
              disabled={assigningClientId !== null}
              onChange={(event) => onAssignAcademic?.(
                student.id,
                event.target.value === "" ? null : Number(event.target.value)
              )}
              className="max-w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 outline-none focus:border-[#294998] focus:ring-2 focus:ring-[#294998]/15 disabled:opacity-60"
            >
              <option value="">Unassigned</option>
              {assignedId != null && !hasCurrentTeacher && (
                <option value={assignedId}>{assignedName || assignedId}</option>
              )}
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          );
        }
        return <span title={assignedName || "Unassigned"}>{assignedName || "Unassigned"}</span>;
      }
      case "classes_per_week":
        return student.classes_per_week ?? "—";
      case "agreed_price":
        return student.agreed_price ?? "—";
      case "mou_start":
        return student.mou_start || "—";
      case "mou_end":
        return student.mou_end || "—";
      case "pricing_basis":
        return student.pricing_basis === "per_month"
          ? "Per Month"
          : student.pricing_basis === "per_class"
            ? "Per Class"
            : "—";
      case "package_name":
        return student.package_name || "—";
      case "principal_name":
        return <span title={student.principal_name || "—"}>{student.principal_name || "—"}</span>;
      case "principal_email":
      case "contact_email":
        return <span title={student[field] || "—"}>{student[field] || "—"}</span>;
      case "principal_number":
      case "contact_number":
        return <span title={student[field] || "—"}>{student[field] || "—"}</span>;
      case "contact_name":
        return <span title={student.contact_name || "—"}>{student.contact_name || "—"}</span>;
      case "actions":
        if (!canManage) return null;
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => handleEdit(student)}
              title="Edit client details"
              className="rounded-[6px] p-1.5 text-slate-400 transition-colors hover:bg-[#EDF2FC] hover:text-[#294998]"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(student.id)}
              title="Return client to Leads"
              className="rounded-[6px] p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      default:
        return student[field] ?? "—";
    }
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-slate-100 transition-colors hover:bg-slate-50/70 ${isDragging ? "bg-[#EDF2FC]/70 shadow-md" : ""} ${isSelected ? "bg-[#EDF2FC]/40" : ""}`}
    >
      <td className="px-1.5 py-2 text-center">
        <button {...attributes} {...listeners} type="button" aria-label="Drag to reorder" className="cursor-grab rounded p-0.5 text-slate-300 transition-colors hover:bg-slate-100 active:cursor-grabbing group-hover:text-slate-400">
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-1.5 py-2 text-center">
        <input type="checkbox" checked={isSelected} onChange={onSelect} aria-label={`Select ${student.school_name || "client"}`} className="h-3.5 w-3.5 rounded border-slate-300 text-[#294998] focus:ring-[#294998]" />
      </td>
      {visibleColumns.map((field) => (
        <td
          key={field}
          title={field === "actions" ? undefined : String(student[field] ?? "—")}
          className={`overflow-hidden text-ellipsis whitespace-nowrap px-1.5 py-2 text-[12px] text-slate-700 ${
            field === "principal_name" ? "w-[200px] min-w-[200px] font-[500] text-slate-900" : ""
          } ${field === "actions" ? "text-right" : ""}`}
        >
          {renderCell(field)}
        </td>
      ))}
    </tr>
  );
};

export default ClientsTable;
