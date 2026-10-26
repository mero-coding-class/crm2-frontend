import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import LeadTableDisplay from "../components/LeadTableDisplay";
import LeadEditModal from "../components/LeadEditModal";
import AddLeadModal from "../components/AddLeadModal";
import LeadsHeader from "../components/LeadsHeader";
import LeadsFilters from "../components/LeadsFilters";
import Toast from "../components/common/Toast";
import PageLoadingState from "../components/common/PageLoadingState.jsx";
import Loader from "../components/common/Loader";
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

import useCourses from "./leads/useCourses";
import useGlobalLeadEvents from "./leads/useGlobalLeadEvents";
import useLeadExports from "./leads/useLeadExports";
import useLeadsHandlers from "./leads/useLeadsHandlers";
import useLeadsCore from "./leads/useLeadsCore";
import useLeadFilters from "./leads/useLeadFilters";
import { leadService } from "../services/api";

const dateBound = (value, endOfDay = false) => {
  if (!value) return "";
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`).toISOString();
};

const Leads = () => {
  const { authToken, user } = useAuth();
  const [searchParams] = useSearchParams();
  const routeFilters = useMemo(() => {
    const filters = {};
    ["created_from", "created_to", "demo", "approval"].forEach((key) => {
      const value = searchParams.get(key);
      if (value && (key !== "approval" || ["pending", "approved"].includes(value))) {
        filters[key] = value;
      }
    });
    const followup = searchParams.get("followup");
    if (followup === "overdue") {
      filters.followup = "overdue";
    } else {
      ["followup_from", "followup_to"].forEach((key) => {
        const value = searchParams.get(key);
        if (value) filters[key] = value;
      });
    }
    return filters;
  }, [searchParams]);
  const role = String(user?.role || "").toLowerCase();
  const canManageLeads = ["admin", "super admin", "superadmin", "super-admin", "b2b"].includes(role);

  // Courses populate the lead creation form.
  const { courses } = useCourses(authToken);

  // Toast and Filters UI
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  const pageSize = 20;
  const {
    allLeads,
    setAllLeads,
    loading,
    error,
    setError,
    handleRefresh,
    fetchAllLeads,
    currentPage,
    totalPages,
    goToPage,
  } = useLeadsCore(authToken, pageSize);

  const { leads, filterSubStatus, setFilterSubStatus } = useLeadFilters(allLeads);

  const [subStatusChoices, setSubStatusChoices] = useState([]);
  useEffect(() => {
    let cancelled = false;
    leadService.getSubStatusChoices(authToken).then((choices) => {
      if (!cancelled && choices.length) setSubStatusChoices(choices);
    });
    return () => { cancelled = true; };
  }, [authToken]);

  // Global filter additions: Followup Date filters
  const [filterFollowupDate, setFilterFollowupDate] = useState("");
  const [filterFollowupFrom, setFilterFollowupFrom] = useState("");
  const [filterFollowupTo, setFilterFollowupTo] = useState("");

  const filterRequestMounted = useRef(false);
  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);
  useEffect(() => {
    const buildFilters = () => {
      const filters = { ...routeFilters };
      const search = searchTerm.trim();
      if (search) filters.search = search;
      if (filterSubStatus !== "SubStatus") filters.sub_status = filterSubStatus;
      const from = filterFollowupFrom || filterFollowupDate;
      const to = filterFollowupTo || filterFollowupDate;
      if (from) filters.followup_from = dateBound(from);
      if (to) filters.followup_to = dateBound(to, true);
      return filters;
    };
    const filters = buildFilters();
    if (!filterRequestMounted.current) {
      filterRequestMounted.current = true;
      if (!Object.keys(filters).length) return undefined;
    }
    const timer = window.setTimeout(() => {
      handleRefresh(1, filters).catch((refreshError) => {
        console.warn("Could not refresh filtered leads", refreshError);
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    searchTerm,
    filterSubStatus,
    filterFollowupDate,
    filterFollowupFrom,
    filterFollowupTo,
    routeFilters,
    searchParams,
    handleRefresh,
  ]);

  const lastRealtimeRefreshRef = useRef(0);
  useEffect(() => {
    if (!authToken) return undefined;
    const refreshVisiblePage = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRealtimeRefreshRef.current < 3000) return;
      lastRealtimeRefreshRef.current = now;
      handleRefresh(currentPage, undefined, { silent: true }).catch(() => {});
    };
    const interval = window.setInterval(refreshVisiblePage, 30000);
    window.addEventListener("focus", refreshVisiblePage);
    document.addEventListener("visibilitychange", refreshVisiblePage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisiblePage);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
  }, [authToken, currentPage, handleRefresh]);

  // Apply free-text search on top of filtered leads
  const currentLeads = leads;

  useGlobalLeadEvents(
    authToken,
    setToast,
    handleRefresh,
    setAllLeads,
    currentPage
  );

  const { fetchingAll: exportingAll, handleExport } = useLeadExports({
    authToken,
    fetchAllLeads,
    setError,
  });

  const {
    isEditModalOpen,
    isAddModalOpen,
    editingLead,
    handleOpenAddModal,
    handleCloseAddModal,
    handleEdit,
    handleCloseEditModal,
    handleActivitySave,
    handleAddNewLead,
    handleSaveEdit,
    handleDelete: handleDeleteLeadFn,
    handleBulkDelete: handleBulkDeleteLeadFn,
  } = useLeadsHandlers({
    authToken,
    allLeads,
    setAllLeads,
    setToast,
    setError,
  });

  // Archive confirmation state
  const [archiveConfirmId, setArchiveConfirmId] = useState(null);
  const [bulkArchiveConfirmIds, setBulkArchiveConfirmIds] = useState(null);
  const [archiveProcessing, setArchiveProcessing] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveNextYearProbability, setArchiveNextYearProbability] = useState(false);

  // Wrapped handlers that show a dialog first
  const handleDelete = useCallback((leadId) => {
    setArchiveReason("");
    setArchiveNextYearProbability(false);
    setArchiveConfirmId(leadId);
  }, []);

  const handleBulkDelete = useCallback((leadIds) => {
    setArchiveReason("");
    setArchiveNextYearProbability(false);
    setBulkArchiveConfirmIds(leadIds);
  }, []);

  const confirmArchive = useCallback(async () => {
    if (!archiveConfirmId) return;
    setArchiveProcessing(true);
    await handleDeleteLeadFn(archiveConfirmId, {
      reason: archiveReason.trim(),
      nextYearProbability: archiveNextYearProbability,
    });
    setArchiveProcessing(false);
    setArchiveConfirmId(null);
  }, [archiveConfirmId, archiveReason, archiveNextYearProbability, handleDeleteLeadFn]);

  const confirmBulkArchive = useCallback(async () => {
    if (!bulkArchiveConfirmIds) return;
    setArchiveProcessing(true);
    await handleBulkDeleteLeadFn(bulkArchiveConfirmIds, {
      reason: archiveReason.trim(),
      nextYearProbability: archiveNextYearProbability,
    });
    setArchiveProcessing(false);
    setBulkArchiveConfirmIds(null);
  }, [bulkArchiveConfirmIds, archiveReason, archiveNextYearProbability, handleBulkDeleteLeadFn]);

  // The backend already scopes this list by the authenticated user's role.
  // removed noisy debug logging

  if (loading) {
    return <PageLoadingState />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-100 p-8">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-[16px] font-semibold text-slate-900 mb-1">Failed to load leads</h3>
          <p className="text-[13px] text-slate-500 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#294998] text-white text-[13px] font-medium rounded-lg hover:bg-[#1E3776] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // removed noisy debug logging

  return (
    <div className="flex flex-col min-h-full bg-[#F8FAFC] text-slate-900">
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

      <LeadsHeader
        handleOpenAddModal={handleOpenAddModal}
        canManageLeads={canManageLeads}
        authToken={authToken}
        handleRefresh={handleRefresh}
        handleExport={() =>
          handleExport({
            searchTerm,
            filterSubStatus,
            followupFrom: dateBound(filterFollowupFrom || filterFollowupDate),
            followupTo: dateBound(filterFollowupTo || filterFollowupDate, true),
          })
        }
        fetchingAll={exportingAll}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        totalCount={currentLeads ? currentLeads.length : 0}
      />

      {/* Non-blocking export progress indicator */}
      {exportingAll && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 shadow-lg rounded-md p-3">
          <Loader
            message={"Preparing export — fetching all leads..."}
            fullScreen={false}
          />
        </div>
      )}

      <LeadsFilters
        showFilters={showFilters}
        filterSubStatus={filterSubStatus}
        setFilterSubStatus={setFilterSubStatus}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        // Followup date filters
        filterFollowupDate={filterFollowupDate}
        setFilterFollowupDate={setFilterFollowupDate}
        filterFollowupFrom={filterFollowupFrom}
        setFilterFollowupFrom={setFilterFollowupFrom}
        filterFollowupTo={filterFollowupTo}
        setFilterFollowupTo={setFilterFollowupTo}
        onClearFilters={() => {
          setFilterSubStatus("SubStatus");
          setSearchTerm("");
          setFilterFollowupDate("");
          setFilterFollowupFrom("");
          setFilterFollowupTo("");
        }}
        subStatusOptions={[
          { value: "SubStatus", label: "All sub-statuses" },
          ...subStatusChoices.map((choice) => ({ value: choice.value, label: choice.label })),
        ]}
      />

      {/* Advanced filters handled by `LeadsFilters` component above. Duplicate block removed. */}

      <div className="flex-1 overflow-x-auto bg-white">
        {error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <LeadTableDisplay
            leads={currentLeads}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            handleBulkDelete={handleBulkDelete}
            canManageLeads={canManageLeads}
            isAdmin={role === "admin"}
            onActivitySave={handleActivitySave}
            authToken={authToken}
            handleOpenAddModal={handleOpenAddModal}
          />
        )}
      </div>

      {canManageLeads && isEditModalOpen && editingLead && (
        <LeadEditModal
          lead={editingLead}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
          courses={courses}
        />
      )}
      {canManageLeads && isAddModalOpen && (
        <AddLeadModal
          onClose={handleCloseAddModal}
          onSave={handleAddNewLead}
          courses={courses}
          authToken={authToken}
        />
      )}
      {/* ─── Archive (soft-delete) confirmation ─── */}
      <AlertDialog open={!!archiveConfirmId} onOpenChange={(open) => { if (!open) setArchiveConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move lead to Archive?</AlertDialogTitle>
            <AlertDialogDescription>
              This lead will be moved to the Archive section. You can restore it at any time from the Archive page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Archive reason
              <textarea
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#294998] focus:outline-none focus:ring-2 focus:ring-[#294998]/15"
                placeholder="Why is this lead being archived?"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={archiveNextYearProbability}
                onChange={(event) => setArchiveNextYearProbability(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#294998] focus:ring-[#294998]"
              />
              Likely to return next year
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} disabled={archiveProcessing || !archiveReason.trim()}>
              {archiveProcessing ? "Moving…" : "Move to Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Bulk Archive confirmation ─── */}
      <AlertDialog open={!!bulkArchiveConfirmIds} onOpenChange={(open) => { if (!open) setBulkArchiveConfirmIds(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {bulkArchiveConfirmIds?.length ?? 0} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkArchiveConfirmIds?.length ?? 0} selected lead(s) will be moved to Archive. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Archive reason
              <textarea
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#294998] focus:outline-none focus:ring-2 focus:ring-[#294998]/15"
                placeholder="Why are these leads being archived?"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={archiveNextYearProbability}
                onChange={(event) => setArchiveNextYearProbability(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#294998] focus:ring-[#294998]"
              />
              Likely to return next year
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkArchive} disabled={archiveProcessing || !archiveReason.trim()}>
              {archiveProcessing ? "Moving…" : `Archive ${bulkArchiveConfirmIds?.length ?? 0} Lead(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Leads;
