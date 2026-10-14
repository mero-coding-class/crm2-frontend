// src/pages/TrashPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import TrashTableDisplay from "../components/TrashDisplayTable.jsx";
import LeadEditModal from "../components/LeadEditModal.jsx";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { AlertTriangle } from "lucide-react";
import { trashService, leadService, courseService } from "../services/api.js";
import { BASE_URL } from "../config";
import DelayedLoader from "../components/common/DelayedLoader";
import { exportsStore } from "../services/exportsStore";
import { apiFetch } from "../services/api";
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

// Helper: convert array of objects to CSV and trigger download
const downloadCsv = (rows, filename = "export.csv") => {
  if (!rows || rows.length === 0) {
    return; // nothing to export — caller can handle this case
  }

  // Collect headers from union of keys
  const headersSet = new Set();
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => headersSet.add(k)));
  const headers = Array.from(headersSet);

  const escapeCell = (val) => {
    if (val === null || val === undefined) return "";
    const s = typeof val === "string" ? val : String(val);
    // Escape quotes by doubling, wrap cell in quotes if it contains comma/newline/quote
    const needsQuotes = /[",\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const csv = [headers.join(",")]
    .concat(rows.map((row) => headers.map((h) => escapeCell(row[h])).join(",")))
    .join("\n");

  // Save to Downloads
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    exportsStore.save({
      fileName: `${filename.replace(/\.csv$/i, "")}__${ts}.csv`,
      mimeType: "text/csv",
      content: csv,
      source: "Trash",
      meta: {},
    });
  } catch {}

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const TrashPage = () => {
  const { authToken, currentUser } = useAuth();
  const [allLeads, setAllLeads] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  // Confirmation dialog state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterAge, setFilterAge] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterLastCall, setFilterLastCall] = useState("");
  const [filterClassType, setFilterClassType] = useState("All");
  const [filterShift, setFilterShift] = useState("");
  const [filterDevice, setFilterDevice] = useState("All");
  const [filterPrevCodingExp, setFilterPrevCodingExp] = useState("All");
  const [filterCourse, setFilterCourse] = useState("All");
  const [courses, setCourses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const statusOptions = ["All", "Lost", "Junk"];
  const classTypeOptions = ["All", "Online", "Physical"];

  const deviceOptions = ["All", "Yes", "No"];
  const previousCodingExpOptions = [
    "All",
    "None",
    "Basic Python",
    "Intermediate C++",
    "Arduino",
    "Some Linux",
    "Advanced Python",
    "Basic Java",
    "Other",
  ];

  const fetchLeads = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      const baseUrl = `${BASE_URL}/archived-leads/`;
      try {
        const url = `${baseUrl}?page=${page}&page_size=${PAGE_SIZE}`;
        const resp = await apiFetch(url, {
          headers: { Authorization: `Token ${authToken}` },
          credentials: "include",
        });
        if (!resp.ok) {
          throw new Error(`Failed to fetch archived leads: ${resp.status}`);
        }
        const json = await resp.json();
        // If API returns paginated object with results and count
        const results = Array.isArray(json.results)
          ? json.results
          : Array.isArray(json)
          ? json
          : json.results || [];
        setAllLeads(
          (results || []).slice().sort((a, b) => {
            const ta = a.created_at || a.updated_at || null;
            const tb = b.created_at || b.updated_at || null;
            if (ta && tb) return new Date(tb) - new Date(ta);
            if (a.id !== undefined && b.id !== undefined)
              return Number(b.id) - Number(a.id);
            return 0;
          })
        );
        if (typeof json.count === "number") {
          setTotalPages(Math.max(1, Math.ceil(json.count / PAGE_SIZE)));
        } else if (Array.isArray(json)) {
          setTotalPages(1);
        } else {
          setTotalPages(1);
        }
        setCurrentPage(page);
      } catch (err) {
        console.error("Failed to fetch leads from trash:", err);
        setError(
          err.message || "Failed to load trashed leads. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [authToken]
  );

  useEffect(() => {
    if (authToken) {
      fetchLeads(currentPage);
    }
  }, [authToken, fetchLeads, currentPage]);

  // Fetch course list so we can show a Course dropdown in filters
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!authToken) return;
      try {
        const res = await courseService.getCourses(authToken);
        const list = Array.isArray(res) ? res : res?.results || [];
        if (!cancelled) setCourses(list);
      } catch (e) {
        console.warn("TrashPage: failed to load courses", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  // Listen for leads moved to trash elsewhere in the app and insert them at top
  useEffect(() => {
    const onLeadMoved = (e) => {
      try {
        const { leadId } = e?.detail || {};
        if (!leadId || !authToken) return;
        // Refresh current page so the moved lead shows up appropriately
        fetchLeads(currentPage);
      } catch (err) {
        console.warn("TrashPage onLeadMoved error:", err);
      }
    };

    window.addEventListener("crm:leadMovedToTrash", onLeadMoved);
    return () =>
      window.removeEventListener("crm:leadMovedToTrash", onLeadMoved);
  }, [authToken]);

  const handleEditLead = useCallback((lead) => {
    setEditingLead(lead);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingLead(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (updatedLead) => {
      const backendUpdates = {
        student_name: updatedLead.studentName,
        parents_name: updatedLead.parentsName,
        email: updatedLead.email,
        phone_number: updatedLead.phone,
        whatsapp_number: updatedLead.contactWhatsapp,
        age: updatedLead.age,
        grade: updatedLead.grade,
        course: updatedLead.course,
        source: updatedLead.source,
        last_call: updatedLead.recentCall,
        next_call: updatedLead.nextCall,
        status: updatedLead.status,
        address_line_1: updatedLead.permanentAddress,
        address_line_2: updatedLead.temporaryAddress,
        city: updatedLead.city,
        county: updatedLead.county,
        post_code: updatedLead.postCode,
        class_type: updatedLead.classType,
        value: updatedLead.value,
        adset_name: updatedLead.adsetName,
        remarks: updatedLead.remarks,
        shift: updatedLead.shift,
        payment_type: updatedLead.paymentType,
        device: updatedLead.device,
        previous_coding_experience: updatedLead.previousCodingExp,
        workshop_batch: updatedLead.workshopBatch,
        add_date: updatedLead.addDate,
        change_log: updatedLead.changeLog,
      };

      try {
        await leadService.updateLead(updatedLead.id, backendUpdates, authToken);
        setAllLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.id === updatedLead.id ? { ...updatedLead, id: lead.id } : lead
          )
        );
        handleCloseEditModal();
      } catch (err) {
        setError("Failed to save changes to lead.");
        console.error("Error saving edited lead:", err);
      }
    },
    [authToken, handleCloseEditModal]
  );

  // Clear all filters and reload first page
  const handleClearFilters = useCallback(() => {
    // Reset filter state to defaults used by the UI
    setSearchTerm("");
    setFilterStatus("All");
    setFilterAge("");
    setFilterGrade("");
    setFilterLastCall("");
    setFilterClassType("All");
    setFilterShift("");
    setFilterDevice("All");
    setFilterPrevCodingExp("All");
    setFilterCourse("All");
    setShowFilters(false);

    // Reset pagination to first page but DO NOT refetch from server.
    // This makes clearing filters instantaneous and smooth because
    // the component will re-render using the already-fetched `allLeads`
    // and `filteredTrashedLeads` memoized selector. If the user wants
    // a full reload they can click Refresh.
    setCurrentPage(1);
  }, []);

  const handlePermanentDeleteLead = useCallback(
    async (id) => {
      setActionProcessing(true);
      try {
        await trashService.deleteTrashedLead(id, authToken);
        setAllLeads((prevLeads) =>
          prevLeads.filter((lead) => lead.id !== id)
        );
      } catch (err) {
        setError("Failed to permanently delete lead.");
        console.error("Error permanently deleting lead:", err);
      } finally {
        setActionProcessing(false);
        setDeleteConfirmId(null);
      }
    },
    [authToken]
  );

  // Wrapper — sets confirmation state instead of calling directly
  const requestDeleteConfirm = useCallback((id) => setDeleteConfirmId(id), []);
  const requestRestoreConfirm = useCallback((id) => setRestoreConfirmId(id), []);

  const handleRestoreLead = useCallback(
    async (id) => {
      setActionProcessing(true);
      setRestoreConfirmId(null);
      try {
        const originalLead = allLeads.find((lead) => lead.id === id);
        if (!originalLead) return;

        // Call trashService.restoreTrashedLead which PATCHes /trash/{id}/ to status Active
        try {
          const restored = await trashService.restoreTrashedLead(id, authToken);

          // Broadcast restored lead so Leads page can insert it immediately
          window.dispatchEvent(
            new CustomEvent("crm:leadRestored", { detail: { lead: restored } })
          );

          // Persist restored lead for Leads page to pick up
          try { localStorage.setItem("crm:restoredLead", JSON.stringify(restored)); } catch {}

          // Remove from local trash list optimistically
          setAllLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== id));

          // Navigate to Leads page to show the restored lead (default status Active)
          setTimeout(() => {
            try { window.location.href = "/leads"; } catch (e) {}
          }, 300);
        } catch (err) {
          console.error(
            "Failed to restore via trashService, falling back to leadService update:",
            err
          );
          // fallback behavior: update lead status back to 'Active' via leadService
          const newLogEntry = {
            timestamp: new Date().toISOString(),
            updaterName: currentUser?.username || "Unknown User",
            updaterRole: currentUser?.role || "Guest",
            message: `Restored from Trash.`,
          };

          const updatedChangeLog = originalLead.changeLog
            ? [...originalLead.changeLog, newLogEntry]
            : [newLogEntry];

          await leadService.updateLead(
            id,
            { status: "Active", changeLog: updatedChangeLog },
            authToken
          );
          try { localStorage.setItem("crm:restoredLead", JSON.stringify({ ...originalLead, status: "Active" })); } catch {}
          setAllLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== id));
          window.dispatchEvent(
            new CustomEvent("crm:leadRestored", {
              detail: { lead: { ...originalLead, status: "Active" } },
            })
          );
          setTimeout(() => {
            try { window.location.href = "/leads"; } catch (e) {}
          }, 300);
        }
      } catch (err) {
        setError("Failed to restore lead.");
        console.error("Error restoring lead:", err);
      } finally {
        setActionProcessing(false);
      }
    },
    [allLeads, authToken, currentUser]
  );

  // --- NEW LOGIC FOR BULK ACTIONS ---

  const handleBulkRestoreLeads = useCallback(
    async (leadIds) => {
      setError(null);
      const restoredIds = new Set();
      const restoredLeads = [];
      const newLogs = {
        timestamp: new Date().toISOString(),
        updaterName: currentUser?.username || "Unknown User",
        updaterRole: currentUser?.role || "Guest",
        message: "Restored from Trash (Bulk Action).",
      };

      try {
        await Promise.all(
          leadIds.map(async (id) => {
            const originalLead = allLeads.find((lead) => lead.id === id);
            if (!originalLead) return;

            try {
              const restored = await trashService.restoreTrashedLead(
                id,
                authToken
              );
              restoredIds.add(id);
              if (restored) restoredLeads.push(restored);
              window.dispatchEvent(
                new CustomEvent("crm:leadRestored", {
                  detail: { lead: restored },
                })
              );
            } catch (err) {
              console.warn(
                "Bulk restore: trashService.restoreTrashedLead failed for",
                id,
                ", falling back to leadService.updateLead",
                err
              );
              const updatedChangeLog = originalLead.changeLog
                ? [...originalLead.changeLog, newLogs]
                : [newLogs];
              await leadService.updateLead(
                id,
                { status: "Active", changeLog: updatedChangeLog },
                authToken
              );
              restoredIds.add(id);
              restoredLeads.push({ ...originalLead, status: "Active" });
              window.dispatchEvent(
                new CustomEvent("crm:leadRestored", {
                  detail: { lead: { ...originalLead, status: "Active" } },
                })
              );
            }
          })
        );
        // Optimistically update the UI to remove restored leads
        setAllLeads((prevLeads) =>
          prevLeads.filter((lead) => !restoredIds.has(lead.id))
        );

        // Persist restored leads for Leads page to pick up
        try {
          localStorage.setItem(
            "crm:restoredLeads",
            JSON.stringify(restoredLeads)
          );
        } catch {}

        // After bulk restore, navigate to leads page to show restored items
        setTimeout(() => {
          try {
            window.location.href = "/leads";
          } catch (e) {}
        }, 300);
      } catch (err) {
        console.error("Error during bulk restore:", err);
        setError("Failed to restore some or all leads.");
        // A full refresh is a good fallback for partial failures
        fetchLeads();
      }
    },
    [authToken, currentUser, allLeads, fetchLeads]
  );

  const handleBulkPermanentDeleteLeads = useCallback(
    async (leadIds) => {
      setError(null);
      const deletedIds = new Set();
      try {
        await Promise.all(
          leadIds.map(async (id) => {
            await trashService.deleteTrashedLead(id, authToken);
            deletedIds.add(id);
          })
        );
        // Optimistically update the UI to remove deleted leads
        setAllLeads((prevLeads) =>
          prevLeads.filter((lead) => !deletedIds.has(lead.id))
        );
      } catch (err) {
        console.error("Error during bulk permanent delete:", err);
        setError("Failed to permanently delete some or all leads.");
        // A full refresh is a good fallback for partial failures
        fetchLeads();
      }
    },
    [authToken, fetchLeads]
  );

  const updateLeadField = useCallback(
    async (leadId, fieldName, newValue) => {
      const leadToUpdate = allLeads.find((lead) => lead.id === leadId);
      if (!leadToUpdate) return;

      const currentTimestamp = new Date().toISOString();
      let message = "";
      let fieldKey = fieldName;

      switch (fieldName) {
        case "status":
          if (leadToUpdate.status !== newValue) {
            message = `Status changed from '${leadToUpdate.status}' to '${newValue}'.`;
          }
          break;
        case "remarks":
          if (leadToUpdate.remarks !== newValue) {
            message = `Remarks updated.`;
          }
          break;
        case "recentCall":
          fieldKey = "last_call";
          if (leadToUpdate.last_call !== newValue) {
            message = `Last Call date changed from '${
              leadToUpdate.last_call || "N/A"
            }' to '${newValue || "N/A"}'.`;
          }
          break;
        case "nextCall":
          fieldKey = "next_call";
          if (leadToUpdate.next_call !== newValue) {
            message = `Next Call date changed from '${
              leadToUpdate.next_call || "N/A"
            }' to '${newValue || "N/A"}'.`;
          }
          break;
        case "device":
          if (leadToUpdate.device !== newValue) {
            message = `Device changed from '${
              leadToUpdate.device || "N/A"
            }' to '${newValue || "N/A"}'.`;
          }
          break;
        case "age":
          if (leadToUpdate.age !== newValue) {
            message = `Age changed from '${leadToUpdate.age || "N/A"}' to '${
              newValue || "N/A"
            }'.`;
          }
          break;
        case "grade":
          if (leadToUpdate.grade !== newValue) {
            message = `Grade changed from '${
              leadToUpdate.grade || "N/A"
            }' to '${newValue || "N/A"}'.`;
          }
          break;
        default:
          if (leadToUpdate[fieldName] !== newValue) {
            message = `${fieldName} updated.`;
          }
          break;
      }

      const newLogEntry = message
        ? {
            timestamp: currentTimestamp,
            updaterName: currentUser?.username || "Unknown User",
            updaterRole: currentUser?.role || "Guest",
            message: message,
          }
        : null;

      const updatedChangeLog = newLogEntry
        ? [...(leadToUpdate.changeLog || []), newLogEntry]
        : leadToUpdate.changeLog;

      const updatesPayload = { [fieldKey]: newValue };
      if (newLogEntry) {
        updatesPayload.changeLog = updatedChangeLog;
      }

      try {
        await leadService.updateLead(leadId, updatesPayload, authToken);
        setAllLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.id === leadId
              ? { ...lead, [fieldName]: newValue, changeLog: updatedChangeLog }
              : lead
          )
        );
      } catch (err) {
        console.error(`Error updating ${fieldName} for lead ${leadId}:`, err);
        setError(`Failed to update ${fieldName}.`);
      }
    },
    [allLeads, authToken, currentUser]
  );

  const handleRefresh = useCallback(() => {
    fetchLeads(currentPage);
  }, [fetchLeads]);

  const filteredTrashedLeads = useMemo(() => {
    let currentLeads = allLeads;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentLeads = currentLeads.filter(
        (lead) =>
          (lead.student_name &&
            lead.student_name.toLowerCase().includes(lowerCaseSearchTerm)) ||
          (lead.email &&
            lead.email.toLowerCase().includes(lowerCaseSearchTerm)) ||
          (lead.phone_number &&
            lead.phone_number.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    if (filterStatus && filterStatus !== "All") {
      currentLeads = currentLeads.filter(
        (lead) => lead.status === filterStatus
      );
    }
    if (filterAge) {
      currentLeads = currentLeads.filter(
        (lead) => lead.age && lead.age.toString().includes(filterAge)
      );
    }
    if (filterGrade) {
      currentLeads = currentLeads.filter(
        (lead) => lead.grade && lead.grade.toString().includes(filterGrade)
      );
    }
    if (filterLastCall) {
      currentLeads = currentLeads.filter(
        (lead) => lead.last_call && lead.last_call.startsWith(filterLastCall)
      );
    }
    if (filterClassType && filterClassType !== "All") {
      currentLeads = currentLeads.filter(
        (lead) => lead.class_type === filterClassType
      );
    }
    if (filterShift && filterShift !== "All") {
      currentLeads = currentLeads.filter((lead) => lead.shift === filterShift);
    }
    if (filterDevice && filterDevice !== "All") {
      currentLeads = currentLeads.filter(
        (lead) => lead.device === filterDevice
      );
    }
    if (filterPrevCodingExp && filterPrevCodingExp !== "All") {
      currentLeads = currentLeads.filter(
        (lead) => lead.previous_coding_experience === filterPrevCodingExp
      );
    }

    // Filter by course if selected
    if (filterCourse && filterCourse !== "All") {
      currentLeads = currentLeads.filter((lead) => {
        // Match by course id or course_name (string compare)
        if (lead.course && String(lead.course) === filterCourse) return true;
        if (lead.course_name && String(lead.course_name) === filterCourse)
          return true;
        return false;
      });
    }
    return currentLeads;
  }, [
    allLeads,
    searchTerm,
    filterStatus,
    filterAge,
    filterGrade,
    filterLastCall,
    filterClassType,
    filterShift,
    filterDevice,
    filterPrevCodingExp,
    filterCourse,
  ]);

  // Export current filtered leads to CSV (client-side, no backend)
  const handleExportCsv = useCallback(() => {
    try {
      // Build comprehensive row objects covering all known fields
      const rows = filteredTrashedLeads.map((lead) => {
        const row = { ...lead };
        // Normalize/aliases
        row.substatus = row.substatus || row.sub_status || "";
        row.course_name =
          row.course_name || row.course?.course_name || row.course || "";
        row.post_code = row.post_code || row.postCode || "";
        row.created_by =
          row.created_by || row.assigned_to || row.createdBy || "";
        row.change_log_summary = (row.changeLog || row.change_log || [])
          .map((c) => {
            const t = c.timestamp || c.time || "";
            const name = c.updaterName || c.updater_name || c.user || "";
            const msg = c.message || c.msg || "";
            return `${t} by ${name}: ${msg}`;
          })
          .join(" | ");
        row.deleted_by =
          row.deleted_by_name || row.deleted_by || row.deleter_name || "";
        row.deleted_at = row.deleted_at || row.deleted_on || row.deleted || "";
        return row;
      });

      const filename = `trashed_leads_page_${currentPage || 1}.csv`;
      downloadCsv(rows, filename);
    } catch (err) {
      console.error("Export CSV failed:", err);
      setError("Failed to export CSV. Please try again.");
    }
  }, [filteredTrashedLeads, currentPage]);

  if (loading) {
    return <DelayedLoader message="Loading trashed leads..." minMs={2000} />;
  }

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen text-gray-900">
      <h1 className="text-3xl font-bold mb-6">Trashed Leads</h1>
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowPathIcon className="h-5 w-5 inline-block mr-2" />
            Refresh Trash
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={handleClearFilters}
            className="flex items-center px-4 py-2 border border-slate-300 cursor-pointer rounded-md bg-[#294998] text-white hover:bg-[#1E3776] transition-colors shadow-sm"
          >
            Clear Filters
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <label className="sr-only">Course</label>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-[#294998] focus:ring-[#294998] sm:text-sm p-2 bg-white"
            >
              <option value="All">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.course_name || c.name || `Course ${c.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by Email, Phone, Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-[#294998] focus:border-[#294998] sm:text-sm transition-all duration-200"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <FunnelIcon className="h-5 w-5 inline-block mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>
      </div>
      {showFilters && (
        <div className="flex flex-wrap items-center justify-end mb-6 gap-3 p-4 border border-gray-200 rounded-md bg-white shadow-sm">
          <h3 className="text-lg font-semibold mr-4">Advanced Filters:</h3>
          <div className="relative w-full sm:w-auto">
            <label className="sr-only">Filter by Lead Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter by Lead Status"
              className="appearance-none w-full p-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "All"
                    ? "All Lead Statuses"
                    : `Lead Status: ${status}`}
                </option>
              ))}
            </select>
            <FunnelIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative w-full sm:w-auto">
            <label className="sr-only">Filter by Age</label>
            <input
              type="text"
              placeholder="Age (e.g., 12 or 12-15)"
              value={filterAge}
              onChange={(e) => setFilterAge(e.target.value)}
              aria-label="Filter by Age"
              className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <label className="sr-only">Filter by Grade</label>
            <input
              type="text"
              placeholder="Grade (e.g., 8 or 9th)"
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              aria-label="Filter by Grade"
              className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <label className="sr-only">Filter by Last Call Date</label>
            <input
              type="date"
              value={filterLastCall}
              onChange={(e) => setFilterLastCall(e.target.value)}
              aria-label="Filter by Last Call Date"
              className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <select
              value={filterClassType}
              onChange={(e) => setFilterClassType(e.target.value)}
              className="appearance-none w-full p-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
            >
              {classTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "Class" : option}
                </option>
              ))}
            </select>
            <FunnelIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative w-full sm:w-auto">
            <label className="sr-only">Filter by Shift Time</label>
            <input
              type="text"
              placeholder="Shift"
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              aria-label="Filter by Shift Time"
              className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <label className="sr-only">Filter by Device Available</label>
            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              aria-label="Filter by Device Available"
              className="appearance-none w-full p-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
            >
              {deviceOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "Any Device" : `Device: ${option}`}
                </option>
              ))}
            </select>
            <FunnelIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative w-full sm:w-auto">
            <label className="sr-only">
              Filter by Previous Coding Experience
            </label>
            <select
              value={filterPrevCodingExp}
              onChange={(e) => setFilterPrevCodingExp(e.target.value)}
              aria-label="Filter by Previous Coding Experience"
              className="appearance-none w-full p-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
            >
              {previousCodingExpOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "Any Experience" : option}
                </option>
              ))}
            </select>
            <FunnelIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        {error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <TrashTableDisplay
            leads={filteredTrashedLeads}
            handleEdit={handleEditLead}
            onPermanentDelete={requestDeleteConfirm}
            onRestoreLead={requestRestoreConfirm}
            onBulkRestore={handleBulkRestoreLeads}
            onBulkPermanentDelete={handleBulkPermanentDeleteLeads}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => fetchLeads(p)}
            onStatusChange={(leadId, newStatus) =>
              updateLeadField(leadId, "status", newStatus)
            }
            onRemarkChange={(leadId, newRemark) =>
              updateLeadField(leadId, "remarks", newRemark)
            }
            onRecentCallChange={(leadId, newDate) =>
              updateLeadField(leadId, "recentCall", newDate)
            }
            onNextCallChange={(leadId, newDate) =>
              updateLeadField(leadId, "nextCall", newDate)
            }
          />
        )}
      </div>

      {isEditModalOpen && editingLead && (
        <LeadEditModal
          lead={editingLead}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
        />
      )}

      {/* ─── Permanent Delete Confirmation ─── */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Permanently Delete Lead?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the lead record. This action <strong>cannot</strong> be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handlePermanentDeleteLead(deleteConfirmId)}
              disabled={actionProcessing}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              {actionProcessing ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Restore Lead Confirmation ─── */}
      <AlertDialog open={!!restoreConfirmId} onOpenChange={(open) => { if (!open) setRestoreConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Restore Lead?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This lead will be moved back to Active Leads and removed from Trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRestoreLead(restoreConfirmId)}
              disabled={actionProcessing}
            >
              {actionProcessing ? "Restoring…" : "Restore Lead"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrashPage;
