// src/pages/Clients.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import PageLoadingState from "../components/common/PageLoadingState.jsx";
import { useAuth } from "../context/useAuth.js";
import ClientsTable from "../components/ClientsTable";
import {
  RotateCw,
  FileDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ClientEditModal from "../components/ClientEditModal";
import Toast from "../components/common/Toast";
import { clientService } from "../services/api";

// Modular hooks and components for Clients page
import useEnrollmentsCore from "./clients/useEnrollmentsCore";
import useEnrollmentFilters from "./clients/useEnrollmentFilters";
import useEnrollmentExport from "./clients/useEnrollmentExport";
import useTeachers from "./clients/useTeachers";
import useEnrollmentEvents from "./clients/useEnrollmentEvents";
import FiltersPanel from "./clients/FiltersPanel";
import useEnrollmentUpdates from "./clients/useEnrollmentUpdates";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";

const Clients = () => {
  const { authToken, user } = useAuth();
  const [searchParams] = useSearchParams();
  const routeSearch = searchParams.get("search") || "";
  const routeFilters = useMemo(() => {
    const filters = {};
    ["renewals", "enrolled_from", "enrolled_to", "converted_from", "converted_to", "contract_from", "contract_to"].forEach((key) => {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    });
    return filters;
  }, [searchParams]);
  const role = user?.role?.toLowerCase();
  const canManageClients = role === "admin";
  const canAssignAcademic = canManageClients || role === "b2b";
  const ITEMS_PER_PAGE = 20;
  // Core paginated state and server fetcher
  const {
    allStudents,
    setAllStudents,
    loading,
    initialLoad,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    searchQueryRef,
    fetchEnrolledStudents,
  } = useEnrollmentsCore(authToken, ITEMS_PER_PAGE, routeFilters);

  // Local UI filters and client-side filtered view
  const {
    searchQuery,
    setSearchQuery,
    filteredStudents,
  } = useEnrollmentFilters(allStudents, routeSearch);

  searchQueryRef.current = searchQuery;
  useEffect(() => { setSearchQuery(routeSearch); }, [routeSearch, setSearchQuery]);

  // Export
  const { exporting, handleExportEnrollments } = useEnrollmentExport(authToken);

  // Academic users can be assigned to client records.
  const { teachers, fetchTeachers } = useTeachers(authToken, canAssignAcademic);
  const [assigningClientId, setAssigningClientId] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const currentPageRef = useRef(currentPage);
  const previousSearchQueryRef = useRef(searchQuery);
  currentPageRef.current = currentPage;
  useEffect(() => {
    searchQueryRef.current = searchQuery;
    if (previousSearchQueryRef.current === searchQuery) return undefined;
    previousSearchQueryRef.current = searchQuery;
    const timer = window.setTimeout(() => {
      if (currentPageRef.current === 1) fetchEnrolledStudents(1);
      else setCurrentPage(1);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [fetchEnrolledStudents, searchQuery, searchQueryRef, setCurrentPage]);

  useEffect(() => {
    if (authToken) fetchEnrolledStudents(currentPage);
  }, [authToken, currentPage, fetchEnrolledStudents]);

  useEnrollmentEvents({
    authToken,
    fetchEnrolledStudents,
    currentPage,
  });
  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  useRealtimeRefresh(authToken, () => {
    fetchEnrolledStudents(currentPage, { silent: true });
    if (canAssignAcademic) fetchTeachers();
  });

  useEffect(() => {
    if (!authToken) return undefined;
    let lastRefreshAt = 0;
    const refreshVisiblePage = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshAt < 3000) return;
      lastRefreshAt = now;
      fetchEnrolledStudents(currentPage, { silent: true });
    };
    const interval = window.setInterval(refreshVisiblePage, 30000);
    window.addEventListener("focus", refreshVisiblePage);
    document.addEventListener("visibilitychange", refreshVisiblePage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisiblePage);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
  }, [authToken, currentPage, fetchEnrolledStudents]);

  const onExport = useCallback(() => {
    handleExportEnrollments({ searchQuery }).catch((exportError) => {
      setToast({ show: true, message: exportError.message || "Could not export clients", type: "error" });
    });
  }, [handleExportEnrollments, searchQuery]);

  const {
    handleDelete,
    handleBulkDelete,
  } = useEnrollmentUpdates({
    authToken,
    allStudents,
    setAllStudents,
    setCurrentPage,
    fetchEnrolledStudents,
    currentPage,
    setToast,
  });

  // Open edit modal for a student
  const handleEdit = useCallback((student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingStudent(null);
  }, []);

  const handleAssignAcademic = useCallback(async (clientId, assignedTo) => {
    setAssigningClientId(clientId);
    try {
      const updated = await clientService.assignAcademic(clientId, assignedTo, authToken);
      setAllStudents((students) => students.map((student) =>
        student.id === clientId ? { ...student, ...updated } : student
      ));
      setToast({
        show: true,
        message: updated.assigned_to_name
          ? `Assigned to ${updated.assigned_to_name}`
          : "Academic assignment cleared",
        type: "success",
      });
    } catch (assignError) {
      setToast({
        show: true,
        message: assignError.message || "Could not update academic assignment",
        type: "error",
      });
    } finally {
      setAssigningClientId(null);
    }
  }, [authToken, setAllStudents]);

  // Show the shared page loader only on the very first load.
  if (initialLoad)
    return <PageLoadingState />;

  if (error) {
    return (
      <div className="m-6 rounded-md bg-red-50 p-4 text-red-700" role="alert">
        <p>Could not load clients: {error}</p>
        <button
          type="button"
          onClick={() => fetchEnrolledStudents(currentPage)}
          className="mt-2 rounded border border-red-200 px-3 py-1 text-sm hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

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
                {allStudents.length} on this page
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

      <FiltersPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onClear={() => setSearchQuery("")}
        loading={loading}
      />

      {/* ─── Clients Table & Content ─── */}
      <div className="p-6">
        <ClientsTable
          students={filteredStudents}
          teachers={teachers}
          canManage={canManageClients}
          canAssignAcademic={canAssignAcademic}
          assigningClientId={assigningClientId}
          onAssignAcademic={handleAssignAcademic}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          handleBulkDelete={handleBulkDelete}
        />

        {/* ─── Integrated Pagination Controls ─── */}
        {totalPages > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
            <p className="text-[13px] text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {filteredStudents.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {(currentPage - 1) * ITEMS_PER_PAGE + filteredStudents.length}
              </span>{" "}
              on this page
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
            teachers={teachers}
            onClose={handleCloseModal}
            onSave={() => {
              setIsModalOpen(false);
              setEditingStudent(null);
              fetchEnrolledStudents(currentPage);
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
