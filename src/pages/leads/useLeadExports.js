import { useCallback, useState } from "react";
import { exportsStore } from "../../services/exportsStore";

const COLUMNS = [
  ["id", "ID"],
  ["system_id", "System ID"],
  ["school_name", "School Name"],
  ["district", "District"],
  ["municipality", "Municipality"],
  ["contact_person", "Contact Person"],
  ["contact_number", "Contact Number"],
  ["sub_status", "Sub-Status"],
];

const escapeCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const downloadCsv = (rows) => {
  if (!rows.length) throw new Error("No leads match the selected filters.");
  const csv = [
    COLUMNS.map(([, label]) => escapeCell(label)).join(","),
    ...rows.map((lead) => COLUMNS.map(([key]) => escapeCell(lead[key])).join(",")),
  ].join("\r\n");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  try {
    exportsStore.save({
      fileName: `leads-${timestamp}.csv`,
      mimeType: "text/csv",
      content: csv,
      source: "Leads",
    });
  } catch {
    // Export history is optional; downloading the CSV remains available.
  }
  const objectUrl = window.URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" })
  );
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "leads.csv";
  link.click();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
};

export default function useLeadExports({ setError }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async (rows = []) => {
    setExporting(true);
    try {
      downloadCsv(rows);
    } catch (error) {
      setError(error.message || "Failed to export leads.");
    } finally {
      setExporting(false);
    }
  }, [setError]);

  return { exporting, handleExport };
}
