import { useCallback, useState } from "react";
import { BASE_URL } from "../../config";
import { exportsStore } from "../../services/exportsStore";
import { deduplicateLeads } from "./utils";

export default function useLeadExports(ctx) {
  const {
    authToken,
    allLeads,
    allLeadsFullRef,
    setAllLeads,
    fetchAllLeads,
    setError,
  } = ctx;

  const [exportConfirmVisible, setExportConfirmVisible] = useState(false);
  const [exportEstimateCount, setExportEstimateCount] = useState(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [exportSizeConfirmed, setExportSizeConfirmed] = useState(false);

  const estimateCountFromServer = useCallback(async (filters) => {
    if (!authToken) return null;
    try {
      const params = new URLSearchParams();
      const add = (k, v) => params.append(k, v);
      const {
        filterStatus,
        searchTerm,
        filterAge,
        filterGrade,
        filterClassType,
        filterShift,
        filterDevice,
        filterSubStatus,
        filterPrevCodingExp,
      } = filters;
      if (filterStatus && filterStatus !== "All") add("status", filterStatus);
      if (searchTerm && searchTerm.trim()) add("search", searchTerm.trim());
      if (filterAge && filterAge.trim()) add("age", filterAge.trim());
      if (filterGrade && filterGrade.trim()) add("grade", filterGrade.trim());
      if (filterClassType && filterClassType !== "Class") add("class_type", filterClassType);
      if (filterShift && filterShift.trim() !== "") add("shift", filterShift.trim());
      if (filterDevice && filterDevice !== "Device") add("device", filterDevice);
      if (filterSubStatus && filterSubStatus !== "SubStatus") add("substatus", filterSubStatus);
      if (filterPrevCodingExp && filterPrevCodingExp !== "CodingExp")
        add("previous_coding_experience", filterPrevCodingExp);

      const url = `${BASE_URL}/leads/?page=1&page_size=1&${params.toString()}`;
      const resp = await fetch(url, { headers: { Authorization: `Token ${authToken}` } });
      if (!resp.ok) return null;
      const json = await resp.json();
      if (json && typeof json.count === "number") return json.count;
      if (Array.isArray(json) && typeof json.length === "number") return json.length;
      return null;
    } catch (e) {
      console.warn("estimateCountFromServer failed:", e);
      return null;
    }
  }, [authToken]);

  const handleExport = useCallback(async (filters) => {
    try {
      if (authToken) {
        try {
          const params = new URLSearchParams();
          const add = (k, v) => params.append(k, v);
          const {
            filterStatus,
            searchTerm,
            filterAge,
            filterGrade,
            filterClassType,
            filterShift,
            filterDevice,
            filterSubStatus,
            filterPrevCodingExp,
          } = filters;
          if (filterStatus && filterStatus !== "All") add("status", filterStatus);
          if (searchTerm && searchTerm.trim()) add("search", searchTerm.trim());
          if (filterAge && filterAge.trim()) add("age", filterAge.trim());
          if (filterGrade && filterGrade.trim()) add("grade", filterGrade.trim());
          if (filterClassType && filterClassType !== "Class") add("class_type", filterClassType);
          if (filterShift && filterShift.trim() !== "") add("shift", filterShift.trim());
          if (filterDevice && filterDevice !== "Device") add("device", filterDevice);
          if (filterSubStatus && filterSubStatus !== "SubStatus") add("substatus", filterSubStatus);
          if (filterPrevCodingExp && filterPrevCodingExp !== "CodingExp")
            add("previous_coding_experience", filterPrevCodingExp);

          const backendExportUrl = `${BASE_URL}/reports/leads/?${params.toString()}${params.toString() ? "&" : ""}export=csv`;
          const resp = await fetch(backendExportUrl, { headers: { Authorization: `Token ${authToken}` } });
          if (resp.ok) {
            const cloned = resp.clone();
            const blob = await resp.blob();
            let text = "";
            try { text = await cloned.text(); } catch {}
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "leads-backend-export.csv";
            a.click();
            window.URL.revokeObjectURL(url);
            try {
              const ts = new Date().toISOString().replace(/[:.]/g, "-");
              exportsStore.save({
                fileName: `leads-backend-export-${ts}.csv`,
                mimeType: "text/csv",
                content: text || "",
                source: "Leads",
                meta: { filters },
              });
            } catch {}
            return;
          }
        } catch {}
      }

      let rows = allLeads || [];
      if (!allLeadsFullRef.current) {
        setFetchingAll(true);
        try {
          rows = await fetchAllLeads();
        } finally {
          setFetchingAll(false);
        }
      }
      if (!rows.length) throw new Error("No leads to export");

      // Helper: normalize invoice field to a backend URL string
      const invoiceUrlOf = (r) => r?.first_invoice?.url ?? r?.first_invoice ?? "";

      // Full field coverage from add/edit forms
      const headers = [
        "id",
        "student_name",
        "parents_name",
        "email",
        "phone_number",
        "whatsapp_number",
        "age",
        "grade",
        "source",
        "course_name",
        "course",
        "course_duration",
        "course_type",
        "class_type",
        "shift",
        "status",
        "substatus",
        "assigned_to",
        "assigned_to_username",
        "lead_type",
        "school_college_name",
        "previous_coding_experience",
        "value",
        "adset_name",
        "remarks",
        "payment_type",
        "device",
        "workshop_batch",
        "address_line_1",
        "address_line_2",
        "city",
        "county",
        "post_code",
        "demo_scheduled",
        "add_date",
        "created_by",
        "created_at",
        "updated_at",
        "first_installment",
        // Single invoice column: backend URL only
        "first_invoice",
        "last_call",
        "next_call",
      ];

      const escapeCell = (v) => {
        if (v === null || v === undefined) return "";
        let s = Array.isArray(v)
          ? v.map((i) => (i?.name || i?.url || String(i))).join(" | ")
          : String(v);
        const needs = /[",\n]/.test(s);
        if (needs) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      };

      const val = (r, h) => {
        switch (h) {
          case "substatus":
            return r.substatus ?? r.sub_status ?? "";
          case "assigned_to":
            return r.assigned_to ?? r.created_by ?? "";
          case "assigned_to_username":
            return r.assigned_to_username ?? r.assigned_to ?? "";
          case "course_duration":
            return r.course_duration ?? r.courseDuration ?? "";
          case "previous_coding_experience":
            return r.previous_coding_experience ?? r.previousCodingExp ?? "";
          case "post_code":
            return r.post_code ?? r.postCode ?? "";
          case "created_by":
            return r.created_by ?? r.assigned_to ?? r.createdBy ?? "";
          case "course_name":
            return (
              r.course_name ?? r.course?.course_name ?? r.course ?? ""
            );
          case "first_invoice":
            return invoiceUrlOf(r) || "";
          default:
            return r[h] ?? "";
        }
      };

      const csv = [headers.join(",")]
        .concat(
          rows.map((r) => headers.map((h) => escapeCell(val(r, h))).join(","))
        )
        .join("\n");

      try {
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        exportsStore.save({
          fileName: `leads-${ts}.csv`,
          mimeType: "text/csv",
          content: csv,
          source: "Leads",
          meta: { filters },
        });
        // No previews; CSV contains only the backend invoice URL
      } catch {}

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leads.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to export CSV");
    }
  }, [authToken, allLeads, allLeadsFullRef, fetchAllLeads, setError]);

  const openExportAllConfirm = useCallback(async (filters) => {
    setExportEstimateCount(null);
    setExportConfirmVisible(true);
    const estimate = await estimateCountFromServer(filters);
    setExportEstimateCount(estimate);
  }, [estimateCountFromServer]);

  const performExportAll = useCallback(async () => {
    setExportConfirmVisible(false);
    try {
      let rows = [];
      try {
        rows = await fetchAllLeads();
      } catch (e) {
        rows = allLeads;
      }
      if (!rows || rows.length === 0) throw new Error("No leads to export");
      // Helper: normalize invoice field to a backend URL string
      const invoiceUrlOf = (r) => r?.first_invoice?.url ?? r?.first_invoice ?? "";
      // Use the same comprehensive headers and mapping as handleExport
      const headers = [
        "id",
        "student_name",
        "parents_name",
        "email",
        "phone_number",
        "whatsapp_number",
        "age",
        "grade",
        "source",
        "course_name",
        "course",
        "course_duration",
        "course_type",
        "class_type",
        "shift",
        "status",
        "substatus",
        "assigned_to",
        "assigned_to_username",
        "lead_type",
        "school_college_name",
        "previous_coding_experience",
        "value",
        "adset_name",
        "remarks",
        "payment_type",
        "device",
        "workshop_batch",
        "address_line_1",
        "address_line_2",
        "city",
        "county",
        "post_code",
        "demo_scheduled",
        "add_date",
        "created_by",
        "created_at",
        "updated_at",
        "first_installment",
        // Single invoice column: backend URL only
        "first_invoice",
        "last_call",
        "next_call",
      ];
      const escapeCell = (v) => {
        if (v === null || v === undefined) return "";
        let s = Array.isArray(v)
          ? v.map((i) => (i?.name || i?.url || String(i))).join(" | ")
          : String(v);
        const needs = /[",\n]/.test(s);
        if (needs) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      const val = (r, h) => {
        switch (h) {
          case "substatus":
            return r.substatus ?? r.sub_status ?? "";
          case "assigned_to":
            return r.assigned_to ?? r.created_by ?? "";
          case "assigned_to_username":
            return r.assigned_to_username ?? r.assigned_to ?? "";
          case "course_duration":
            return r.course_duration ?? r.courseDuration ?? "";
          case "previous_coding_experience":
            return r.previous_coding_experience ?? r.previousCodingExp ?? "";
          case "post_code":
            return r.post_code ?? r.postCode ?? "";
          case "created_by":
            return r.created_by ?? r.assigned_to ?? r.createdBy ?? "";
          case "course_name":
            return (
              r.course_name ?? r.course?.course_name ?? r.course ?? ""
            );
          case "first_invoice":
            return invoiceUrlOf(r) || "";
          default:
            return r[h] ?? "";
        }
      };
      const csv = [headers.join(",")]
        .concat(rows.map((r) => headers.map((h) => escapeCell(val(r, h))).join(",")))
        .join("\n");
      try {
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        exportsStore.save({
          fileName: `leads-all-${ts}.csv`,
          mimeType: "text/csv",
          content: csv,
          source: "Leads",
          meta: { type: "all" },
        });
        // No previews; CSV contains only the backend invoice URL
      } catch {}
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leads-all.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to export CSV");
    }
  }, [allLeads, fetchAllLeads, setError]);

  return {
    exportConfirmVisible,
    setExportConfirmVisible,
    exportEstimateCount,
    setExportEstimateCount,
    exportSizeConfirmed,
    setExportSizeConfirmed,
    fetchingAll,
    setFetchingAll,
    estimateCountFromServer,
    handleExport,
    openExportAllConfirm,
    performExportAll,
  };
}
