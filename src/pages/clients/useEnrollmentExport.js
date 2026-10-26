import { useCallback, useState } from "react";
import { clientService } from "../../services/api";
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

export default function useEnrollmentExport(authToken) {
  const [exporting, setExporting] = useState(false);

  const handleExportEnrollments = useCallback(
    async ({ searchQuery = "" } = {}) => {
      if (!authToken || exporting) return;
      setExporting(true);
      try {
        const pageSize = 100;
        let page = 1;
        let clients = [];

        while (true) {
          const response = await clientService.getClients(authToken, {
            page,
            pageSize,
            search: searchQuery.trim(),
          });
          const results = Array.isArray(response)
            ? response
            : response?.results || response?.data || [];
          clients = clients.concat(results);

          const count = Array.isArray(response)
            ? null
            : response?.count ?? response?.total ?? null;
          if (count != null) {
            if (page >= Math.max(1, Math.ceil(count / pageSize))) break;
          } else if (results.length < pageSize) {
            break;
          }
          page += 1;
        }

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
    [authToken, exporting]
  );

  return { exporting, handleExportEnrollments };
}
