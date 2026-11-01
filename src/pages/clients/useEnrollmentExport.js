import { useCallback, useState } from "react";
import { exportsStore } from "../../services/exportsStore";

const EXPORT_COLUMNS = [
  "id",
  "lead_id",
  "system_id",
  "school_name",
  "district",
  "municipality",
  "principal_name",
  "principal_number",
  "principal_email",
  "contact_name",
  "contact_number",
  "contact_email",
  "mou_start",
  "mou_end",
  "agreed_price",
  "pricing_basis",
  "classes_per_week",
  "package_name",
  "syllabus_name",
  "exams_count",
  "events_count",
  "assigned_to_name",
  "mcc_rep_name",
  "enrolled_at",
  "enrolled_by_name",
];

const escapeCsv = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export default function useEnrollmentExport() {
  const [exporting, setExporting] = useState(false);

  const handleExportEnrollments = useCallback(
    async ({ clients = [], searchQuery = "" } = {}) => {
      if (exporting) return;
      setExporting(true);
      try {
        if (!clients.length) throw new Error("No clients to export.");

        const csv = [
          EXPORT_COLUMNS.join(","),
          ...clients.map((client) => EXPORT_COLUMNS.map((column) => escapeCsv(client[column])).join(",")),
        ].join("\r\n");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `clients-export-${timestamp}.csv`;

        exportsStore.save({
          fileName,
          mimeType: "text/csv",
          content: csv,
          source: "Clients",
          meta: { searchQuery },
        });

        const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } finally {
        setExporting(false);
      }
    },
    [exporting]
  );

  return { exporting, handleExportEnrollments };
}
