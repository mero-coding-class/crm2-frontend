// src/pages/EnrolledStudents.jsx

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
import EnrolledStudentsTable from "../components/EnrolledStudentsTable";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import EnrolledStudentEditModal from "../components/EnrolledStudentEditModal";
import { courseService } from "../services/courseService";
import { BASE_URL } from "../config";
import Toast from "../components/common/Toast";

// New modular hooks and components for Enrolled Students page
import useEnrollmentsCore from "./enrolled/useEnrollmentsCore";
import useEnrollmentFilters from "./enrolled/useEnrollmentFilters";
import useEnrollmentExport from "./enrolled/useEnrollmentExport";
import useTeachers from "./enrolled/useTeachers";
import useEnrollmentEvents from "./enrolled/useEnrollmentEvents";
import FiltersPanel from "./enrolled/FiltersPanel";
import useEnrollmentUpdates from "./enrolled/useEnrollmentUpdates";

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
          } catch (e) {}
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
          `safeFetch: network error when fetching ${url} (attempt ${
            attempt + 1
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

const EnrolledStudents = () => {
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

  // Use the configured API base for enrollment endpoints
  const ENROLLMENTS_API_BASE = `${BASE_URL}/enrollments/`;

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
      } catch {}
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

  // Delete handlers now provided by useEnrollmentUpdates

  // Show full-screen delayed loader only on the very first load. For
  // subsequent background fetches (e.g. debounce-driven) keep the table
  // visible and avoid sudden re-render/replace.
  if (initialLoad)
    return (
      <DelayedLoader message="Loading enrolled students..." minMs={2000} />
    );

  if (error)
    return (
      <div className="text-red-500 p-4 bg-red-100 rounded-md">
        Error: {error}
      </div>
    );

  return (
    <div className="bg-[#F8FAFC] min-h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-[20px] font-[600] leading-[28px] tracking-[-0.015em] text-slate-900">Enrolled Students</h1>
        <p className="text-[13px] text-slate-500 leading-[18px] mt-0.5">Manage and track enrolled students</p>
      </div>
      <div className="p-6">
      {/* Filters */}
      <FiltersPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchLastPaymentDate={searchLastPaymentDate}
        setSearchLastPaymentDate={setSearchLastPaymentDate}
        filterPaymentNotCompleted={filterPaymentNotCompleted}
        setFilterPaymentNotCompleted={setFilterPaymentNotCompleted}
        filterScheduledTaken={filterScheduledTaken}
        setFilterScheduledTaken={setFilterScheduledTaken}
        exporting={exporting}
        onExport={onExport}
        onClear={() => {
          setSearchQuery("");
          setSearchLastPaymentDate("");
          setFilterPaymentNotCompleted(false);
          setFilterScheduledTaken("");
          setCurrentPage(1);
        }}
        loading={loading}
      />

      {/* Students Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <EnrolledStudentsTable
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
      </div>

      {/* Pagination controls (arrow + Page X of Y style) */}
      <div className="flex justify-end items-center mt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <span className="mx-4 text-sm font-medium text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingStudent && (
        <EnrolledStudentEditModal
          student={editingStudent}
          teachers={teachers}
          onClose={handleCloseModal}
          onSave={async (updatedStudent) => {
            const resp = await handleUpdateField(
              updatedStudent.id,
              null,
              updatedStudent
            );
            if (resp) {
              // close modal and show toast
              setIsModalOpen(false);
              setEditingStudent(null);
              setToast({
                show: true,
                message: "Updated successfully",
                type: "success",
                duration: 3000,
              });
            }
            return resp;
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

export default EnrolledStudents;
