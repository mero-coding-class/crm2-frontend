import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { leadService } from "../services/api";
import {
  FileDown,
  RotateCw,
  Search,
  RotateCcw,
  Building2,
  Landmark,
  GraduationCap,
  School,
  MapPin,
  User,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ListFilter,
  Folder,
  Eye,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Toast from "../components/common/Toast";
import DelayedLoader from "../components/common/DelayedLoader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const Archive = () => {
  const { authToken } = useAuth();
  const tableContainerRef = useRef(null);

  const [archivedList, setArchivedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedProbability, setSelectedProbability] = useState("All");
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewingRecord, setViewingRecord] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pageSize = 10;

  // Map a backend lead row to the shape Archive UI expects
  const mapLeadToArchiveItem = useCallback((lead, idx = 0) => ({
    id: lead.id,
    school_name: lead.school_name || `School #${lead.id}`,
    contact_person: lead.contact_person || lead.owner_username || "—",
    code: lead.system_id ? `#${lead.system_id}` : `#${lead.id}`,
    district: lead.district || "—",
    municipality: lead.municipality || "—",
    conversion_prob: lead.next_year_probability === true ? 75 : lead.next_year_probability === false ? 30 : 50,
    archived_date: lead.updated_at
      ? new Date(lead.updated_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—",
    reason: lead.archive_reason || "Archived from pipeline",
    sub_status: lead.sub_status || "—",
    source: lead.source || "—",
    iconType: ["building", "landmark", "graduation", "school"][idx % 4],
    // Keep full lead data for the detail view
    _raw: lead,
  }), []);

  // Fetch archived leads from the backend
  const fetchArchivedData = useCallback(async (page = 1) => {
    if (!authToken) return;
    setLoading(true);
    try {
      const resp = await leadService.getArchivedLeads(authToken, page, pageSize, {
        search: searchTerm.trim() || undefined,
        district: selectedDistrict !== "All" ? selectedDistrict : undefined,
      });
      const mapped = (resp.results || []).map((lead, idx) => mapLeadToArchiveItem(lead, idx));
      setArchivedList(mapped);
      setTotalPages(resp.totalPages || 1);
      setCurrentPage(page);
    } catch (err) {
      console.error("Archive fetch failed:", err);
      setArchivedList([]);
    } finally {
      setLoading(false);
    }
  }, [authToken, pageSize, searchTerm, selectedDistrict, mapLeadToArchiveItem]);

  useEffect(() => {
    fetchArchivedData(1);
  }, [fetchArchivedData]);

  // Re-fetch when a lead is archived elsewhere in the app
  useEffect(() => {
    const onArchived = () => fetchArchivedData(1);
    window.addEventListener("crm:leadArchived", onArchived);
    return () => window.removeEventListener("crm:leadArchived", onArchived);
  }, [fetchArchivedData]);



  // Unique districts for filter dropdown
  const districtOptions = useMemo(() => {
    const set = new Set();
    archivedList.forEach((item) => {
      if (item.district) set.add(item.district);
    });
    return Array.from(set);
  }, [archivedList]);

  // Client-side filter by probability only (search/district already sent to server)
  const filteredList = useMemo(() => {
    return archivedList.filter((item) => {
      let matchProb = true;
      if (selectedProbability === "high") matchProb = item.conversion_prob >= 70;
      else if (selectedProbability === "medium")
        matchProb = item.conversion_prob >= 40 && item.conversion_prob < 70;
      else if (selectedProbability === "low") matchProb = item.conversion_prob < 40;
      return matchProb;
    });
  }, [archivedList, selectedProbability]);

  // Server handles pagination; paginatedList = filteredList
  const paginatedList = filteredList;

  // Selection handlers
  const handleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allPaginated = paginatedList.map((item) => item.id);
      setSelectedIds(new Set([...selectedIds, ...allPaginated]));
    } else {
      const next = new Set(selectedIds);
      paginatedList.forEach((item) => next.delete(item.id));
      setSelectedIds(next);
    }
  };

  // Restore single lead back to active pipeline
  const handleRestore = async (id) => {
    try {
      await leadService.restoreLead(id, authToken);
      setArchivedList((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setToast({ show: true, message: "Lead restored to active pipeline.", type: "success" });
      try {
        window.dispatchEvent(new CustomEvent("crm:leadRestored", { detail: { leadId: id } }));
      } catch {}
    } catch (err) {
      setToast({ show: true, message: err.message || "Failed to restore lead.", type: "error" });
    }
  };

  // Bulk restore
  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    let restored = 0;
    for (const id of selectedIds) {
      try {
        await leadService.restoreLead(id, authToken);
        restored++;
      } catch {}
    }
    setArchivedList((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    setToast({
      show: true,
      message: `${restored} lead(s) restored to active pipeline.`,
      type: restored > 0 ? "success" : "error",
    });
    if (restored > 0) {
      try { window.dispatchEvent(new CustomEvent("crm:leadRestored", {})); } catch {}
    }
  };

  // Permanently delete a single archived lead
  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      // Use DELETE on the archived-lead endpoint (permanent delete)
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/leads/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Token ${authToken}` },
        }
      );
      if (!resp.ok && resp.status !== 204 && resp.status !== 200) {
        throw new Error(`Failed to delete: ${resp.status}`);
      }
      setArchivedList((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setToast({ show: true, message: "Record permanently deleted.", type: "success" });
    } catch (err) {
      setToast({ show: true, message: err.message || "Failed to delete record.", type: "error" });
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  // Permanently delete multiple archived leads
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    let deleted = 0;
    const errors = [];
    for (const id of selectedIds) {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/leads/${id}/`,
          {
            method: "DELETE",
            headers: { Authorization: `Token ${authToken}` },
          }
        );
        if (resp.ok || resp.status === 204 || resp.status === 200) {
          deleted++;
        } else {
          errors.push(id);
        }
      } catch {
        errors.push(id);
      }
    }
    setArchivedList((prev) => prev.filter((item) => !selectedIds.has(item.id) || errors.includes(item.id)));
    setSelectedIds(new Set(errors));
    setBulkDeleteConfirmOpen(false);
    setDeleting(false);
    setToast({
      show: true,
      message: errors.length === 0
        ? `${deleted} record(s) permanently deleted.`
        : `${deleted} deleted, ${errors.length} failed.`,
      type: errors.length === 0 ? "success" : "error",
    });
  };

  // Smooth scroll helper for wide tables
  const smoothScroll = (distance) => {
    if (!tableContainerRef.current) return;
    tableContainerRef.current.scrollBy({ left: distance, behavior: "smooth" });
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!filteredList.length) {
      alert("No data to export.");
      return;
    }
    const headers = [
      "School Name",
      "Contact Person",
      "Code",
      "District",
      "Municipality",
      "Conversion Probability",
      "Archived Date",
      "Reason",
    ];

    const rows = filteredList.map((item) => [
      `"${item.school_name.replace(/"/g, '""')}"`,
      `"${item.contact_person.replace(/"/g, '""')}"`,
      `"${item.code}"`,
      `"${item.district}"`,
      `"${item.municipality.replace(/"/g, '""')}"`,
      `${item.conversion_prob}%`,
      `"${item.archived_date}"`,
      `"${item.reason.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Archived_Schools_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderIcon = (type) => {
    switch (type) {
      case "landmark":
        return <Landmark className="w-3.5 h-3.5 text-[#294998]" />;
      case "graduation":
        return <GraduationCap className="w-3.5 h-3.5 text-sky-600" />;
      case "school":
        return <School className="w-3.5 h-3.5 text-[#294998]" />;
      default:
        return <Building2 className="w-3.5 h-3.5 text-[#294998]" />;
    }
  };

  const renderProbabilityBadge = (prob) => {
    if (prob >= 70) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-sky-50 text-sky-700 border border-sky-100 whitespace-nowrap">
          High ({prob}%)
        </span>
      );
    }
    if (prob >= 40) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-purple-50 text-purple-700 border border-purple-100 whitespace-nowrap">
          Medium ({prob}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-rose-50 text-rose-700 border border-rose-100 whitespace-nowrap">
        Low ({prob}%)
      </span>
    );
  };

  if (loading) {
    return <DelayedLoader message="Loading archived records..." minMs={1500} />;
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-[Inter,system-ui,sans-serif] antialiased">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}

      {/* ─── Header: Identical to LeadsHeader ─── */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-[700] text-slate-900 tracking-[-0.015em]">
                Archive
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-[#EEF2F6] text-slate-600">
                {filteredList.length} Archived Schools
              </span>
            </div>
            <p className="text-[13px] text-slate-500 mt-1">
              Manage, filter and restore archived school leads and institutional records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-[500] transition-colors ${
                showFilters
                  ? "bg-[#EDF2FC] text-[#294998] ring-1 ring-[#CDDBF6]"
                  : "bg-[#EEF2F6] hover:bg-slate-200 text-slate-700"
              }`}
            >
              <ListFilter className="h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Export CSV
            </button>

            <button
              onClick={fetchArchivedData}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ─── Filters & Search: Identical to LeadsFilters ─── */}
      {showFilters && (
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[220px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search school, district, contact…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 pl-9 pr-3 text-[13px] rounded-[9999px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15 hover:border-slate-300 transition-colors"
              />
            </div>

            <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-[0.04em] mr-1">
              District:
            </span>

            {/* District Pill */}
            <div className="relative">
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 pl-3 pr-7 text-[13px] font-[500] rounded-[9999px] border border-slate-200 bg-white text-slate-700 appearance-none cursor-pointer transition-colors hover:border-slate-300 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15"
                style={{ minWidth: "140px" }}
              >
                <option value="All">All Districts</option>
                {districtOptions.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>

            <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-[0.04em] ml-2 mr-1">
              Probability:
            </span>

            {/* Probability Pill */}
            <div className="relative">
              <select
                value={selectedProbability}
                onChange={(e) => {
                  setSelectedProbability(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 pl-3 pr-7 text-[13px] font-[500] rounded-[9999px] border border-slate-200 bg-white text-slate-700 appearance-none cursor-pointer transition-colors hover:border-slate-300 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15"
                style={{ minWidth: "150px" }}
              >
                <option value="All">All Probabilities</option>
                <option value="high">High (&ge; 70%)</option>
                <option value="medium">Medium (40-69%)</option>
                <option value="low">Low (&lt; 40%)</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>

            {(searchTerm || selectedDistrict !== "All" || selectedProbability !== "All") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDistrict("All");
                  setSelectedProbability("All");
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1 text-[12px] font-[500] text-[#294998] hover:text-[#1E3776] ml-2"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            )}

            <div className="ml-auto flex items-center gap-2 text-[12px] text-slate-500 hidden sm:flex">
              <span className="w-1.5 h-1.5 rounded-full bg-[#294998] inline-block" />
              <span>Complete intake audit history preserved</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bulk actions toolbar (Like LeadTableDisplay) ─── */}
      {selectedIds.size > 0 && (
        <div className="flex justify-between items-center px-6 py-2.5 border-b border-[#CDDBF6] bg-[#EDF2FC]/70 transition-all">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-slate-700">
              <span className="font-[600] text-[#294998]">{selectedIds.size}</span> record(s) selected
            </span>
            <button
              onClick={handleBulkRestore}
              className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-[500] rounded-[6px] bg-white border border-[#CDDBF6] text-[#294998] hover:bg-[#294998] hover:text-white transition-colors shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore Selected ({selectedIds.size})
            </button>
            <button
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-[500] rounded-[6px] bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Permanently ({selectedIds.size})
            </button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[12px] text-slate-500 hover:text-slate-800 transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ─── Table Display ─── */}
      <div className="flex-1 overflow-x-auto bg-white custom-scrollbar">
          {paginatedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white min-h-[380px]">
              <div className="w-16 h-16 rounded-[18px] bg-[#EDF2FC] flex items-center justify-center mb-5 text-[#294998]">
                <Folder className="w-8 h-8 stroke-[1.75]" />
              </div>
              <h2 className="text-[18px] font-[600] text-slate-900 mb-2 tracking-[-0.01em] whitespace-nowrap">
                No archived records found
              </h2>
              <p className="text-[14px] text-slate-500 max-w-md mx-auto mb-6 leading-relaxed whitespace-nowrap">
                No archived school records match your current search or filter criteria.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDistrict("All");
                  setSelectedProbability("All");
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Filters
              </button>
            </div>
          ) : (
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 h-9 w-10 text-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={
                        paginatedList.length > 0 &&
                        paginatedList.every((item) => selectedIds.has(item.id))
                      }
                      onChange={handleSelectAll}
                      className="h-3.5 w-3.5 rounded-[4px] border-slate-300 text-[#294998] focus:ring-[#294998] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                    School Name
                  </th>
                  <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                    District
                  </th>
                  <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                    Municipality
                  </th>
                  <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                    Conversion Probability
                  </th>
                  <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                    Archived Date & Reason
                  </th>
                  <th className="px-4 h-9 text-right text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap pr-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {paginatedList.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isChecked ? "bg-[#EDF2FC]/50" : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 w-10 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(item.id)}
                          className="h-3.5 w-3.5 rounded-[4px] border-slate-300 text-[#294998] focus:ring-[#294998] cursor-pointer"
                        />
                      </td>

                      {/* School Name */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                          <div className="w-7 h-7 rounded-[6px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center shrink-0">
                            {renderIcon(item.iconType)}
                          </div>
                          <div className="whitespace-nowrap">
                            <span className="text-[13px] font-[600] text-slate-900 block leading-snug whitespace-nowrap">
                              {item.school_name}
                            </span>
                            <span className="text-[12px] text-slate-500 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{item.contact_person}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400 font-mono text-[11px]">{item.code}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* District */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[13px] font-[500] text-slate-800 whitespace-nowrap">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.district}</span>
                        </div>
                      </td>

                      {/* Municipality */}
                      <td className="px-4 py-3 text-[13px] text-slate-600 whitespace-nowrap">
                        {item.municipality}
                      </td>

                      {/* Next Year Conversion Probability */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderProbabilityBadge(item.conversion_prob)}
                      </td>

                      {/* Archived Date & Reason */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-[600] text-[13px] text-slate-900 block whitespace-nowrap">
                          {item.archived_date}
                        </span>
                        <span className="text-[12px] text-slate-500 block mt-0.5 whitespace-nowrap">
                          {item.reason}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap pr-6">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setViewingRecord(item)}
                            title="View Record Details"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[6px] transition-colors whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRestore(item.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#EDF2FC] hover:bg-[#CDDBF6]/60 text-[#294998] text-[12px] font-[500] transition-colors whitespace-nowrap"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            title="Delete permanently"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[6px] transition-colors whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      {/* ─── Pagination Footer: Identical to Leads ─── */}
      <div className="px-6 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-slate-500">
        <div className="whitespace-nowrap">
          Showing {paginatedList.length} of {filteredList.length} archived records
        </div>

        <div className="flex items-center gap-2 whitespace-nowrap">
          <button
            onClick={() => fetchArchivedData(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <span className="px-3 py-1 rounded-[6px] bg-slate-50 text-slate-700 text-[12px] font-[600] whitespace-nowrap">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => fetchArchivedData(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Single Delete Confirmation ─── */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Permanently Delete Record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The archived record will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteConfirmId)}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              {deleting ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Bulk Delete Confirmation ─── */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Delete {selectedIds.size} Record(s) Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} selected archived record(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              {deleting ? "Deleting…" : `Delete ${selectedIds.size} Record(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── View Record Details Modal ─── */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[16px] shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[16px] font-[600] text-slate-900">
                    Archived School Details
                  </h3>
                  <p className="text-[12px] text-slate-500 font-mono">
                    {viewingRecord.code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-[13px]">
              <div>
                <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-wider block mb-1">
                  School Name
                </span>
                <p className="text-[15px] font-[600] text-slate-900">
                  {viewingRecord.school_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-wider block mb-1">
                    District
                  </span>
                  <p className="text-slate-800 font-[500]">{viewingRecord.district}</p>
                </div>
                <div>
                  <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-wider block mb-1">
                    Municipality
                  </span>
                  <p className="text-slate-800 font-[500]">{viewingRecord.municipality}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-wider block mb-1">
                    Contact Person
                  </span>
                  <p className="text-slate-800 font-[500]">{viewingRecord.contact_person}</p>
                </div>
                <div>
                  <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-wider block mb-1">
                    Conversion Probability
                  </span>
                  <div>{renderProbabilityBadge(viewingRecord.conversion_prob)}</div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-wider block mb-1">
                  Archived Date
                </span>
                <p className="text-slate-800 font-[500]">{viewingRecord.archived_date}</p>
              </div>

              <div>
                <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-wider block mb-1">
                  Reason for Archive
                </span>
                <div className="p-3 bg-slate-50 rounded-[10px] border border-slate-200 text-slate-700">
                  {viewingRecord.reason}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleRestore(viewingRecord.id);
                  setViewingRecord(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#294998] hover:bg-[#1E3776] text-white shadow-sm transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore to Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Archive;
