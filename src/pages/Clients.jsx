// src/pages/Clients.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Loader from "../components/common/Loader";
import DelayedLoader from "../components/common/DelayedLoader";
import { useAuth } from "../context/AuthContext.jsx";
import ClientsTable from "../components/ClientsTable";
import {
  Building2,
  CheckCircle2,
  Clock,
  MonitorPlay,
  RotateCw,
  FileDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ClientEditModal from "../components/ClientEditModal";
import { courseService } from "../services/api";
import { BASE_URL } from "../config";
import Toast from "../components/common/Toast";

// Modular hooks and components for Clients page
import useEnrollmentsCore from "./clients/useEnrollmentsCore";
import useEnrollmentFilters from "./clients/useEnrollmentFilters";
import useEnrollmentExport from "./clients/useEnrollmentExport";
import useTeachers from "./clients/useTeachers";
import useEnrollmentEvents from "./clients/useEnrollmentEvents";
import FiltersPanel from "./clients/FiltersPanel";
import useEnrollmentUpdates from "./clients/useEnrollmentUpdates";

// A small in-memory map to deduplicate identical outgoing requests
// (helps avoid duplicate fetches triggered by StrictMode double-invoke
// or concurrent callers). Each entry holds the Promise for the request
// and is removed when finished.
const _ongoingRequests = new Map();

async function safeFetchWithRetries(
  url,
  opts = {},
  retries = 3,
  backoff = 300,
  timeoutMs = 8000
) {
  const controller = new AbortController();
  const mergedOpts = { ...opts, signal: controller.signal };

  for (let attempt = 0; attempt <= retries; attempt++) {
    let timeoutHandle;
    try {
      const p = fetch(url, mergedOpts);
      const race = new Promise((_, rej) => {
        timeoutHandle = setTimeout(() => {
          try {
            controller.abort();
          } catch (e) { }
          rej(new Error("timeout"));
        }, timeoutMs);
      });
      const resp = await Promise.race([p, race]);
      clearTimeout(timeoutHandle);
      return resp;
    } catch (e) {
      clearTimeout(timeoutHandle);
      const isLast = attempt === retries;
      if (isLast) {
        console.warn(
          `safeFetch: network error when fetching ${url} (attempt ${attempt + 1
          }/${retries + 1})`,
          e && e.message ? e.message : e
        );
        console.error(`safeFetch: exhausted retries for ${url}`);
      }
      if (isLast) return null;
      await new Promise((res) =>
        setTimeout(res, backoff * Math.pow(2, attempt))
      );
    }
  }
  return null;
}

const Clients = () => {
  const { authToken } = useAuth();
  const ITEMS_PER_PAGE = 20;
  // Core paginated state and server fetcher
  const {
    allStudents,
    setAllStudents,
    loading,
    setLoading,
    initialLoad,
    setInitialLoad,
    error,
    setError,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    // filter refs used by server fetching
    searchQueryRef,
    searchLastPaymentDateRef,
    filterPaymentNotCompletedRef,
    filterScheduledTakenRef,
    fetchEnrolledStudents,
  } = useEnrollmentsCore(authToken, ITEMS_PER_PAGE);

  // Local UI filters and client-side filtered view
  const {
    searchQuery,
    setSearchQuery,
    searchLastPaymentDate,
    setSearchLastPaymentDate,
    filterPaymentNotCompleted,
    setFilterPaymentNotCompleted,
    filterScheduledTaken,
    setFilterScheduledTaken,
    filteredStudents,
  } = useEnrollmentFilters(allStudents);

  // Export
  const { exporting, handleExportEnrollments } = useEnrollmentExport(authToken);

  // Teachers
  const { teachers, fetchTeachers } = useTeachers(authToken);
  const [courses, setCourses] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Refs for debounced server filter fetching
  // (provided by core hook) searchQueryRef, searchLastPaymentDateRef, filterPaymentNotCompletedRef, filterScheduledTakenRef
  // Ref to access handleUpdateField inside early effects without TDZ
  const handleUpdateFieldRef = useRef(null);
  // Ref to always read the latest students list inside event handlers
  const allStudentsRef = useRef(allStudents);

  useEffect(() => {
    allStudentsRef.current = allStudents;
  }, [allStudents]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);
  useEffect(() => {
    searchLastPaymentDateRef.current = searchLastPaymentDate;
  }, [searchLastPaymentDate]);
  useEffect(() => {
    filterPaymentNotCompletedRef.current = filterPaymentNotCompleted;
  }, [filterPaymentNotCompleted]);
  useEffect(() => {
    filterScheduledTakenRef.current = filterScheduledTaken;
  }, [filterScheduledTaken]);

  // Use the real backend clients endpoint (replaced old /enrollments/)
  const ENROLLMENTS_API_BASE = `${BASE_URL}/clients/`;

  // Local, client-side filtered view of the current page of students.
  // This lets typing in the search box filter the visible table immediately
  // without waiting for the debounced server fetch. Server-driven filters
  // still occur (debounced) to update server-side results across pages.
  // filteredStudents provided by useEnrollmentFilters

  // Server-driven pagination: fetch enrollments for a page
  // fetchEnrolledStudents provided by useEnrollmentsCore

  // Global events: import, invoice selection, conversion, manual refresh
  useEnrollmentEvents({
    authToken,
    fetchEnrolledStudents,
    currentPage,
    setAllStudents,
    setError,
    setToast,
    students: allStudents,
    handleUpdateFieldRef,
  });

  // Respond to lead updates: if backend returns enrollment info or updates a
  // student's fields, merge them into enrolled students list.
  useEffect(() => {
    const onLeadUpdated = (e) => {
      try {
        const updated = e?.detail?.lead;
        if (!updated) return;

        // If the updated lead includes an enrollment id or resembles an enrollment
        // object, try to merge by id or insert if new.
        const enrollmentCandidate = updated.enrollment || null;

        if (enrollmentCandidate && enrollmentCandidate.id) {
          setAllStudents((prev) => {
            const seen = new Set();
            const updatedList = [];
            let mergedHandled = false;
            // Prepend merged/updated enrollment first
            updatedList.push({ ...enrollmentCandidate });
            seen.add(String(enrollmentCandidate.id));
            for (const s of prev) {
              const sid = s && s.id != null ? String(s.id) : null;
              if (!sid) {
                updatedList.push(s);
                continue;
              }
              if (sid === String(enrollmentCandidate.id)) {
                if (!mergedHandled) {
                  // already pushed new version at top; mark handled
                  mergedHandled = true;
                }
                continue; // skip old duplicate
              }
              if (seen.has(sid)) continue; // skip any dup just in case
              seen.add(sid);
              updatedList.push(s);
            }
            return updatedList;
          });
          return;
        }

        // Otherwise attempt to match by email/phone if the lead became an enrolled
        // student and the backend returned student-like fields (best-effort).
        setAllStudents((prev) => {
          let changed = false;
          const next = [];
          const seen = new Set();
          for (const s of prev) {
            if (!s) continue;
            const sid = s.id != null ? String(s.id) : null;
            if (
              (updated.email && s.email === updated.email) ||
              (updated.phone_number && s.phone_number === updated.phone_number)
            ) {
              changed = true;
              const merged = { ...s, ...updated };
              // Move merged match to TOP if not already placed
              if (sid && !seen.has(sid)) {
                seen.add(sid);
                next.unshift(merged); // put at start
              } else {
                next.unshift(merged);
              }
            } else {
              if (sid) {
                if (seen.has(sid)) continue; // skip duplicates
                seen.add(sid);
              }
              next.push(s);
            }
          }
          return changed ? next : prev;
        });
      } catch (err) {
        console.warn("EnrolledStudents: failed to apply crm:leadUpdated", err);
      }
    };

    window.addEventListener("crm:leadUpdated", onLeadUpdated);
    // Listen for explicit first_installment updates coming from Leads
    const onLeadFI = (e) => {
      try {
        const leadId = e?.detail?.leadId;
        const fi = e?.detail?.first_installment;
        if (!leadId) return;
        setAllStudents((prev) =>
          (prev || []).map((s) =>
            s?.lead && String(s.lead.id) === String(leadId)
              ? { ...s, lead: { ...(s.lead || {}), first_installment: fi } }
              : s
          )
        );
      } catch { }
    };
    window.addEventListener("crm:leadFirstInstallmentUpdated", onLeadFI);
    return () => {
      window.removeEventListener("crm:leadUpdated", onLeadUpdated);
      window.removeEventListener("crm:leadFirstInstallmentUpdated", onLeadFI);
    };
  }, []);

  // Listen for enrollment created events so we can insert new enrollments
  // without requiring a page refresh.
  useEffect(() => {
    const onEnrollmentCreated = (e) => {
      try {
        const enrollment = e?.detail?.enrollment;
        if (!enrollment) return;
        setAllStudents((prev) => {
          const seen = new Set();
          const list = [enrollment];
          seen.add(String(enrollment.id));
          for (const s of prev) {
            const sid = s && s.id != null ? String(s.id) : null;
            if (sid && seen.has(sid)) continue; // skip duplicate
            if (sid) seen.add(sid);
            list.push(s);
          }
          return list;
        });
      } catch (err) {
        console.warn("Failed to handle crm:enrollmentCreated event", err);
      }
    };
    window.addEventListener("crm:enrollmentCreated", onEnrollmentCreated);
    return () =>
      window.removeEventListener("crm:enrollmentCreated", onEnrollmentCreated);
  }, []);

  // Fetch course list so we can display friendly course names in the table
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!authToken) return;
      try {
        const res = await courseService.getCourses(authToken);
        const list = Array.isArray(res) ? res : res?.results || [];
        if (!cancelled) setCourses(list);
      } catch (e) {
        console.warn("EnrolledStudents: failed to load courses", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  // Fetch teachers once auth available
  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Refetch when filters change (debounced) and reset to page 1.
  // If we're not already on page 1, set page to 1 and let the page-change
  // effect trigger the fetch. If already on page 1, call fetch once.
  useEffect(() => {
    if (!authToken) return;
    const id = setTimeout(() => {
      if (currentPage !== 1) {
        // change page -> existing effect will call fetchEnrolledStudents(1)
        setCurrentPage(1);
      } else {
        // already on page 1 -> fetch once
        fetchEnrolledStudents(1);
      }
    }, 600); // slightly longer debounce to avoid firing on every small typing
    return () => clearTimeout(id);
  }, [
    searchQuery,
    searchLastPaymentDate,
    filterPaymentNotCompleted,
    filterScheduledTaken,
    authToken,
    fetchEnrolledStudents,
    currentPage,
  ]);

  // Export enrollments using hook with current filters
  const onExport = useCallback(() => {
    return handleExportEnrollments({
      searchQuery,
      searchLastPaymentDate,
      filterPaymentNotCompleted,
      filterScheduledTaken,
    });
  }, [
    handleExportEnrollments,
    searchQuery,
    searchLastPaymentDate,
    filterPaymentNotCompleted,
    filterScheduledTaken,
  ]);

  // handleUpdateField provided by useEnrollmentUpdates

  // Updates: field edits, payment status, deletes
  const {
    handleUpdateField,
    handleUpdatePaymentStatus,
    handleDelete,
    handleBulkDelete,
  } = useEnrollmentUpdates({
    authToken,
    teachers,
    allStudents,
    setAllStudents,
    fetchEnrolledStudents,
    currentPage,
    setToast,
    setError,
  });

  // keep a ref to avoid temporal dead zone in earlier effects
  useEffect(() => {
    handleUpdateFieldRef.current = handleUpdateField;
  }, [handleUpdateField]);

  // Open edit modal for a student
  const handleEdit = useCallback((student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingStudent(null);
  }, []);

  const stats = useMemo(() => {
    const total = allStudents?.length || 0;
    const paidCompleted =
      allStudents?.filter((s) => Boolean(s.payment_completed)).length || 0;
    const paymentPending = total - paidCompleted;
    const demoTaken =
      allStudents?.filter((s) => {
        const v =
          s.scheduled_taken ||
          (s.lead && s.lead.scheduled_taken) ||
          s.demo_scheduled ||
          (s.lead && s.lead.demo_scheduled);
        return v === "Yes" || v === true;
      }).length || 0;
    return { total, paidCompleted, paymentPending, demoTaken };
  }, [allStudents]);

  // Delete handlers now provided by useEnrollmentUpdates

  // Show full-screen delayed loader only on the very first load.
  if (initialLoad)
    return (
      <DelayedLoader message="Loading clients..." minMs={150} />
    );

  if (error)
    return (
      <div className="text-red-500 p-4 bg-red-100 rounded-md">
        Error: {error}
      </div>
    );

  return (
    <div className="flex flex-col min-h-full bg-[#F8FAFC] font-[Inter,system-ui,sans-serif] antialiased">
      {/* ─── Header: Aligned with Leads & Demo ─── */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-[700] text-slate-900 tracking-[-0.015em]">
                Clients Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-[#EEF2F6] text-slate-600">
                {stats.total} Total
              </span>
            </div>
            <p className="text-[13px] text-slate-500 mt-1">
              Manage and track school clients, institutional contracts, and fee structures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => fetchEnrolledStudents(currentPage)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              onClick={onExport}
              disabled={exporting}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-[500] bg-[#294998] hover:bg-[#1E3776] text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Metric Strip ─── */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center justify-between p-3 rounded-[10px] bg-slate-50 border border-slate-200/70">
            <div>
              <p className="text-[11px] font-[600] text-slate-400 uppercase tracking-[0.04em]">
                Total Clients
              </p>
              <p className="text-[18px] font-[700] text-slate-900 mt-0.5">{stats.total}</p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-white border border-slate-200/80 flex items-center justify-center text-slate-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[10px] bg-emerald-50/50 border border-emerald-200/70">
            <div>
              <p className="text-[11px] font-[600] text-emerald-600 uppercase tracking-[0.04em]">
                Paid / Active
              </p>
              <p className="text-[18px] font-[700] text-slate-900 mt-0.5">{stats.paidCompleted}</p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-white border border-emerald-200/80 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[10px] bg-amber-50/50 border border-amber-200/70">
            <div>
              <p className="text-[11px] font-[600] text-amber-600 uppercase tracking-[0.04em]">
                Payment Pending
              </p>
              <p className="text-[18px] font-[700] text-slate-900 mt-0.5">{stats.paymentPending}</p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-white border border-amber-200/80 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[10px] bg-blue-50/50 border border-blue-200/70">
            <div>
              <p className="text-[11px] font-[600] text-blue-600 uppercase tracking-[0.04em]">
                Demo Completed
              </p>
              <p className="text-[18px] font-[700] text-slate-900 mt-0.5">{stats.demoTaken}</p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-white border border-blue-200/80 flex items-center justify-center text-blue-600">
              <MonitorPlay className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sleek Toolbar Filters ─── */}
      <FiltersPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchLastPaymentDate={searchLastPaymentDate}
        setSearchLastPaymentDate={setSearchLastPaymentDate}
        filterPaymentNotCompleted={filterPaymentNotCompleted}
        setFilterPaymentNotCompleted={setFilterPaymentNotCompleted}
        filterScheduledTaken={filterScheduledTaken}
        setFilterScheduledTaken={setFilterScheduledTaken}
        onClear={() => {
          setSearchQuery("");
          setSearchLastPaymentDate("");
          setFilterPaymentNotCompleted(false);
          setFilterScheduledTaken("");
          setCurrentPage(1);
        }}
        loading={loading}
      />

      {/* ─── Clients Table & Content ─── */}
      <div className="p-6">
        <ClientsTable
          students={filteredStudents}
          courses={courses}
          teachers={teachers}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          handleBulkDelete={handleBulkDelete}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
          onUpdateField={handleUpdateField}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
        />

        {/* ─── Integrated Pagination Controls ─── */}
        {totalPages > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
            <p className="text-[13px] text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(
                  (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  filteredStudents?.length || 0
                )}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredStudents?.length || 0
                )}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {filteredStudents?.length || 0}
              </span>{" "}
              filtered clients
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-[500] text-slate-700 bg-white border border-slate-200 rounded-[8px] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="px-3 py-1.5 text-[13px] font-[500] text-slate-600 bg-slate-100 rounded-[8px] border border-slate-200/70">
                Page {currentPage} of {Math.max(1, totalPages)}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-[500] text-slate-700 bg-white border border-slate-200 rounded-[8px] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isModalOpen && editingStudent && (
          <ClientEditModal
            isOpen={isModalOpen}
            client={editingStudent}
            authToken={authToken}
            onClose={handleCloseModal}
            onSave={(updatedClient) => {
              setAllStudents((prev) =>
                (prev || []).map((s) => {
                  if (String(s.id) !== String(updatedClient.id)) return s;
                  return {
                    ...s,
                    ...updatedClient,
                    school_name: updatedClient.school_name || s.school_name,
                    student_name: updatedClient.school_name || s.student_name,
                    principal_name: updatedClient.principal_name,
                    parents_name: updatedClient.principal_name || s.parents_name,
                    contact_name: updatedClient.contact_name,
                    contact_number: updatedClient.contact_number,
                    contact_email: updatedClient.contact_email,
                    phone_number: updatedClient.contact_number || s.phone_number,
                    email: updatedClient.contact_email || s.email,
                    total_payment: updatedClient.agreed_price != null ? `NPR ${updatedClient.agreed_price}` : s.total_payment,
                    payment_type: updatedClient.pricing_basis === "per_month" ? "Per Month" : (updatedClient.pricing_basis === "per_class" ? "Per Class" : s.payment_type),
                    batchname: updatedClient.classes_per_week ? `${updatedClient.classes_per_week} classes/wk` : s.batchname,
                    course_duration: updatedClient.mou_start && updatedClient.mou_end ? `${updatedClient.mou_start} ~ ${updatedClient.mou_end}` : s.course_duration,
                  };
                })
              );
              setIsModalOpen(false);
              setEditingStudent(null);
              setToast({
                show: true,
                message: "Client details updated successfully",
                type: "success",
                duration: 3000,
              });
            }}
          />
        )}

        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration ?? 6000}
            onClose={() =>
              setToast({ show: false, message: "", type: "success" })
            }
          />
        )}
      </div>{/* end p-6 */}
    </div>
  );
};

export default Clients;
