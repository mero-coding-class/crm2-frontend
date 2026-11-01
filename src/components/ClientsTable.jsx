import React, { useEffect, useState } from "react";
import { Building2, GripVertical, Pencil, Undo2 } from "lucide-react";
import ColumnToggler from "./ColumnToggler";
import DataTableShell from "./common/DataTableShell.jsx";
import { Button } from "./ui/button.jsx";
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
  assigned_to: { label: "Client Academic Assignee", visible: true },
  mou_start: { label: "MOU Start", visible: true },
  mou_end: { label: "MOU End", visible: true },
  pricing_basis: { label: "Pricing Basis", visible: true },
  agreed_price: { label: "Agreed Price", visible: true },
  actions: { label: "Actions", visible: true },
};

const ClientsTable = ({
  clients = [],
  handleEdit,
  handleDelete,
  handleBulkDelete,
  academicUsers = [],
  canManage = false,
  canAssignAcademic = false,
  assigningClientId = null,
  onAssignAcademic,
  pagination = null,
}) => {
  const [orderedClients, setOrderedClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState(new Set());
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
    setOrderedClients(clients);
    setSelectedClients(new Set());
  }, [clients]);

  const handleDragEnd = ({ active, over }) => {
    if (!active || !over || active.id === over.id) return;
    setOrderedClients((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const visibleColumns = Object.keys(columns).filter((key) => columns[key].visible);

  return (
    <DataTableShell minWidth="1500px" pagination={pagination}>
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
        <div className="flex items-center gap-3">
          {canManage && selectedClients.size > 0 && (
            <Button
              variant="restore"
              size="sm"
              type="button"
              onClick={() => handleBulkDelete([...selectedClients])}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Return to Leads ({selectedClients.size})
            </Button>
          )}
          <span className="text-xs font-medium text-slate-500">
            {orderedClients.length} {orderedClients.length === 1 ? "client" : "clients"} on this page
          </span>
        </div>
        <ColumnToggler columns={columns} setColumns={setColumns} canManage={canManage} />
      </div>

      {clients.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No clients found</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            No clients match this search.
          </p>
        </div>
      ) : (
        <div className="crm-data-table__scroll custom-scrollbar">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="table-fixed divide-y divide-slate-200 text-left">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="w-7 px-1.5 py-2"><span className="sr-only">Reorder</span></th>
                <th className="w-7 px-1.5 py-2 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all clients on this page"
                    checked={selectedClients.size === orderedClients.length && orderedClients.length > 0}
                    onChange={(event) =>
                      setSelectedClients(
                        event.target.checked
                          ? new Set(orderedClients.map((client) => client.id))
                          : new Set()
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </th>
                {visibleColumns.map((key) => (
                  <th
                    key={key}
                    title={columns[key].label}
                    className={`overflow-hidden text-ellipsis px-1.5 py-2 text-left whitespace-nowrap text-xs font-semibold uppercase tracking-[0.02em] text-slate-500 ${
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
            <SortableContext items={orderedClients.map((client) => client.id)} strategy={verticalListSortingStrategy}>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orderedClients.map((client) => (
                  <SortableClientRow
                    key={client.id}
                    client={client}
                    visibleColumns={visibleColumns}
                    isSelected={selectedClients.has(client.id)}
                    onSelect={() =>
                      setSelectedClients((selected) => {
                        const next = new Set(selected);
                        if (next.has(client.id)) next.delete(client.id);
                        else next.add(client.id);
                        return next;
                      })
                    }
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    academicUsers={academicUsers}
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
      )}
    </DataTableShell>
  );
};

const SortableClientRow = ({
  client,
  visibleColumns,
  isSelected,
  onSelect,
  handleEdit,
  handleDelete,
  academicUsers,
  canManage,
  canAssignAcademic,
  assigningClientId,
  onAssignAcademic,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: client.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
  };

  const renderCell = (field) => {
    switch (field) {
      case "system_id":
        return <span title={client.system_id || "—"}>{client.system_id || "—"}</span>;
      case "school_name":
        return <span title={client.school_name || "—"} className="font-semibold text-slate-900">{client.school_name || "—"}</span>;
      case "assigned_to": {
        const assignedId = client.assigned_to?.id ?? client.assigned_to;
        const assignedName = client.assigned_to_name ||
          academicUsers.find((academicUser) => String(academicUser.id) === String(assignedId))?.name;
        if (canAssignAcademic) {
          const hasCurrentAcademicUser = academicUsers.some(
            (academicUser) => String(academicUser.id) === String(assignedId)
          );
          return (
            <select
              aria-label={`Academic user for ${client.school_name || "client"}`}
              value={assignedId ?? ""}
              disabled={assigningClientId !== null}
              onChange={(event) => onAssignAcademic?.(
                client.id,
                event.target.value === "" ? null : Number(event.target.value)
              )}
              className="max-w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            >
              <option value="">Unassigned</option>
              {assignedId != null && !hasCurrentAcademicUser && (
                <option value={assignedId}>{assignedName || assignedId}</option>
              )}
              {academicUsers.map((academicUser) => (
                <option key={academicUser.id} value={academicUser.id}>{academicUser.name}</option>
              ))}
            </select>
          );
        }
        return <span title={assignedName || "Unassigned"}>{assignedName || "Unassigned"}</span>;
      }
      case "classes_per_week":
        return client.classes_per_week ?? "—";
      case "agreed_price":
        return client.agreed_price ?? "—";
      case "mou_start":
        return client.mou_start || "—";
      case "mou_end":
        return client.mou_end || "—";
      case "pricing_basis":
        return client.pricing_basis === "per_month"
          ? "Per Month"
          : client.pricing_basis === "per_class"
            ? "Per Class"
            : "—";
      case "package_name":
        return client.package_name || "—";
      case "principal_name":
        return <span title={client.principal_name || "—"}>{client.principal_name || "—"}</span>;
      case "principal_email":
      case "contact_email":
        return <span title={client[field] || "—"}>{client[field] || "—"}</span>;
      case "principal_number":
      case "contact_number":
        return <span title={client[field] || "—"}>{client[field] || "—"}</span>;
      case "contact_name":
        return <span title={client.contact_name || "—"}>{client.contact_name || "—"}</span>;
      case "actions":
        if (!canManage) return null;
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => handleEdit(client)}
              title="Edit client details"
              className="rounded-[6px] p-1.5 text-slate-400 transition-colors hover:bg-primary-light hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(client.id)}
              title="Return client to Leads"
              className="rounded-[6px] p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      default:
        return client[field] ?? "—";
    }
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-slate-100 transition-colors hover:bg-slate-50/70 ${isDragging ? "bg-primary-light/70 shadow-md" : ""} ${isSelected ? "bg-primary-light/40" : ""}`}
    >
      <td className="px-1.5 py-2 text-center">
        <button {...attributes} {...listeners} type="button" aria-label="Drag to reorder" className="cursor-grab rounded p-0.5 text-slate-300 transition-colors hover:bg-slate-100 active:cursor-grabbing group-hover:text-slate-400">
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-1.5 py-2 text-center">
        <input type="checkbox" checked={isSelected} onChange={onSelect} aria-label={`Select ${client.school_name || "client"}`} className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary" />
      </td>
      {visibleColumns.map((field) => (
        <td
          key={field}
          title={field === "actions" ? undefined : String(client[field] ?? "—")}
          className={`overflow-hidden text-ellipsis whitespace-nowrap px-1.5 py-2 text-xs text-slate-700 ${
            field === "principal_name" ? "w-[200px] min-w-[200px] font-medium text-slate-900" : ""
          } ${field === "actions" ? "text-right" : ""}`}
        >
          {renderCell(field)}
        </td>
      ))}
    </tr>
  );
};

export default ClientsTable;
