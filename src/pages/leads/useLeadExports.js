import { useCallback, useState } from "react";
import { leadService } from "../../services/api";
import { exportsStore } from "../../services/exportsStore";

export default function useLeadExports({ setError }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async (filters, authToken) => {
    setExporting(true);
    try {
      const blob = await leadService.exportLeads(filters, authToken);
      try {
        const text = await blob.text();
        exportsStore.save({
          fileName: `leads-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`,
          mimeType: "text/csv",
          content: text,
          source: "Leads",
        });
      } catch {
        // Export history is optional; downloading the CSV remains available.
      }
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "leads.csv";
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
    } catch (error) {
      setError(error.message || "Failed to export leads.");
    } finally {
      setExporting(false);
    }
  }, [setError]);

  return { exporting, handleExport };
}
