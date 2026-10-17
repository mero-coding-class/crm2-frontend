import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import LeadTableDisplay from "../components/LeadTableDisplay";
import LeadEditModal from "../components/LeadEditModal";
import AddLeadModal from "../components/AddLeadModal";
import LeadsHeader from "../components/LeadsHeader";
import LeadsFilters from "../components/LeadsFilters";
import Toast from "../components/common/Toast";
import DelayedLoader from "../components/common/DelayedLoader";
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

import useUsers from "./leads/useUsers";
import useCourses from "./leads/useCourses";
import useGlobalLeadEvents from "./leads/useGlobalLeadEvents";
import useLeadExports from "./leads/useLeadExports";
import useLeadsHandlers from "./leads/useLeadsHandlers";
import useLeadsCore, { SAMPLE_PLACEHOLDER_LEAD } from "./leads/useLeadsCore";
import useLeadFilters from "./leads/useLeadFilters";
import { deduplicateLeads } from "./leads/utils";
import {
  EXPORT_WARNING_THRESHOLD,
  EXPORT_REQUIRE_CHECKBOX_THRESHOLD,
} from "./leads/constants";
import { changeLogService } from "../services/api";

const Leads = () => {
  const { authToken, user } = useAuth();

  // Users and courses
  const { users, usersLoading } = useUsers(authToken);
  const { courses } = useCourses(authToken);

  // Toast and Filters UI
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const pageSize = 20;
  const {
    allLeads,
    setAllLeads,
    loading,
    loadError,
    setLoadError,
    actionError,
    setActionError,
    fetchingAll,
    setFetchingAll,
    allLeadsFullRef,
    handleRefresh,
    fetchAllLeads,
    currentPage,
    totalPages,
    goToPage,
  } = useLeadsCore(authToken, pageSize);

  const {
    leads,
    setLeads,
    filterStatus,
    setFilterStatus,
    filterAge,
    setFilterAge,
    filterGrade,
    setFilterGrade,
    filterLastCall,
    setFilterLastCall,
    filterClassType,
    setFilterClassType,
    filterShift,
    setFilterShift,
    filterDevice,
    setFilterDevice,
    filterSubStatus,
    setFilterSubStatus,
    filterPrevCodingExp,
    setFilterPrevCodingExp,
    filterAssignedTo,
    setFilterAssignedTo,
  } = useLeadFilters(allLeads, allLeadsFullRef, fetchAllLeads);

  // Global filter additions: Followup Date filters
  const [filterFollowupDate, setFilterFollowupDate] = useState("");
  const [filterFollowupFrom, setFilterFollowupFrom] = useState("");
  const [filterFollowupTo, setFilterFollowupTo] = useState("");

  // Apply free-text search on top of filtered leads
  const searchedLeads = useMemo(() => {
    if (!searchTerm.trim()) return deduplicateLeads(leads);
    const q = searchTerm.trim().toLowerCase();
    return deduplicateLeads(
      (leads || []).filter(
        (l) =>
          (l.student_name || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q) ||
          (l.phone_number || "").toLowerCase().includes(q)
      )
    );
  }, [leads, searchTerm]);

  useGlobalLeadEvents(
    authToken,
    allLeadsFullRef,
    setToast,
    handleRefresh,
    setAllLeads
  );

  const {
    exportConfirmVisible: exportConfirmVisibleHook,
    setExportConfirmVisible: setExportConfirmVisibleHook,
    exportEstimateCount: exportEstimateCountHook,
    setExportEstimateCount: setExportEstimateCountHook,
    exportSizeConfirmed,
    setExportSizeConfirmed,
    fetchingAll: exportingAll,
    setFetchingAll: setExportingAll,
    estimateCountFromServer,
    handleExport,
    openExportAllConfirm,
    performExportAll,
  } = useLeadExports({
    authToken,
    allLeads,
    allLeadsFullRef,
    setAllLeads,
    fetchAllLeads,
    setActionError,
  });

  const {
    isEditModalOpen,
    isAddModalOpen,
    editingLead,
    handleOpenAddModal,
    handleCloseAddModal,
    handleEdit,
    handleCloseEditModal,
    updateLeadField,
    handleAssignedToChange,
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
    setActionError,
    courses,
  });

  // Archive confirmation state
  const [archiveConfirmId, setArchiveConfirmId] = useState(null);
  const [bulkArchiveConfirmIds, setBulkArchiveConfirmIds] = useState(null);
  const [archiveProcessing, setArchiveProcessing] = useState(false);

  // Wrapped handlers that show a dialog first
  const handleDelete = useCallback((leadId) => {
    setArchiveConfirmId(leadId);
  }, []);

  const handleBulkDelete = useCallback((leadIds) => {
    setBulkArchiveConfirmIds(leadIds);
  }, []);

  const confirmArchive = useCallback(async () => {
    if (!archiveConfirmId) return;
    setArchiveProcessing(true);
    await handleDeleteLeadFn(archiveConfirmId);
    setArchiveProcessing(false);
    setArchiveConfirmId(null);
  }, [archiveConfirmId, handleDeleteLeadFn]);

  const confirmBulkArchive = useCallback(async () => {
    if (!bulkArchiveConfirmIds) return;
    setArchiveProcessing(true);
    await handleBulkDeleteLeadFn(bulkArchiveConfirmIds);
    setArchiveProcessing(false);
    setBulkArchiveConfirmIds(null);
  }, [bulkArchiveConfirmIds, handleBulkDeleteLeadFn]);

  const handleStatusChange = useCallback(
    async (leadId, newStatus) => {
      if (newStatus === "Converted") {
        const lead = (allLeads || []).find(
          (l) => String(l.id || l._id || "") === String(leadId)
        );
        if (!lead?.first_invoice) {
          alert("Invoice is required when setting status to 'Converted'");
          return;
        }
      }
      updateLeadField(leadId, "status", newStatus);
    },
    [updateLeadField, allLeads]

  );
 
  const handleSubStatusChange = useCallback(
    (leadId, newSubStatus) =>
      updateLeadField(leadId, "sub_status", newSubStatus),
    [updateLeadField]
  );
  const handleRemarkChange = useCallback(
    (leadId, newRemark) => updateLeadField(leadId, "remarks", newRemark),
    [updateLeadField]
  );
  const handleLastCallChange = useCallback(
    (leadId, newDate) => updateLeadField(leadId, "last_call", newDate),
    [updateLeadField]
  );
  const handleNextCallChange = useCallback(
    (leadId, newDate) => updateLeadField(leadId, "next_call", newDate),
    [updateLeadField]
  );
  const handleAgeChange = useCallback(
    (leadId, newAge) => updateLeadField(leadId, "age", newAge),
    [updateLeadField]
  );
  const handleGradeChange = useCallback(
    (leadId, newGrade) => updateLeadField(leadId, "grade", newGrade),
    [updateLeadField]
  );

  const handleCourseDurationChange = useCallback(
    (leadId, newDuration) =>
      updateLeadField(leadId, "course_duration", newDuration),
    [updateLeadField]
  );

  const handleShiftChange = useCallback(
    (leadId, newShift) => updateLeadField(leadId, "shift", newShift),
    [updateLeadField]
  );

  const handleScheduledTakenChange = useCallback(
    (leadId, newVal) => updateLeadField(leadId, "scheduled_taken", newVal),
    [updateLeadField]
  );

  // Export handler is provided by useLeadExports

  const handleFieldChange = useCallback(
    (id, field, value) => {
      setAllLeads((prev) =>
        deduplicateLeads(
          prev.map((lead) =>
            String(lead.id || lead._id || "") === String(id)
              ? { ...lead, [field]: value }
              : lead
          )
        )
      );
    },
    [setAllLeads]
  );

  const role = user?.role?.toString().toLowerCase();
  const isAdmin =
    user &&
    (role === "admin" ||
      role === "super admin" ||
      role === "superadmin" ||
      role === "super-admin");

  // Consolidated non-admin scoping: keep only leads assigned to the current user
  const currentLeads = useMemo(() => {
    let result = deduplicateLeads([...searchedLeads]);
    if (!isAdmin) {
      const username = (
        (user && user.username) || localStorage.getItem("username") || ""
      ).trim().toLowerCase();
      if (username) {
        result = result.filter((lead) => {
          const aNorm = (lead.assigned_to_normalized || "").toLowerCase();
          const auNorm = (lead.assigned_to_username_normalized || "").toLowerCase();
          const aRaw = String(lead.assigned_to || "").trim();
          const auRaw = String(lead.assigned_to_username || "").trim();
          return (
            (aNorm && aNorm === username) ||
            (auNorm && auNorm === username) ||
            aRaw === (user?.username || "") ||
            auRaw === (user?.username || "")
          );
        });
      }
    }
    return result;
  }, [searchedLeads, isAdmin, user, searchTerm]);

  // removed noisy debug logging

  if (loading) {
    return <DelayedLoader message="Loading leads..." minMs={2000} />;
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-[16px] font-[600] text-slate-900 mb-1">Failed to load leads</h3>
          <p className="text-[13px] text-slate-500 mb-4">{loadError}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#294998] text-white text-[13px] font-[500] rounded-[8px] hover:bg-[#1E3776] transition-colors"
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
        authToken={authToken}
        courses={courses}
        handleRefresh={handleRefresh}
        handleExport={() =>
          handleExport({
            filterStatus,
            searchTerm,
            filterAge,
            filterGrade,
            filterClassType,
            filterShift,
            filterDevice,
            filterSubStatus,
            filterPrevCodingExp,
            filterAssignedTo,
          })
        }
        handleExportAll={async () => {
          // Open confirmation modal and estimate count using current filters
          openExportAllConfirm({
            filterStatus,
            searchTerm,
            filterAge,
            filterGrade,
            filterClassType,
            filterShift,
            filterDevice,
            filterSubStatus,
            filterPrevCodingExp,
            filterAssignedTo,
          });
        }}
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

      {/* Export All confirmation dialog */}
      <AlertDialog
        open={exportConfirmVisibleHook}
        onOpenChange={(open) => {
          if (!open) {
            setExportConfirmVisibleHook(false);
            setExportSizeConfirmed(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export all filtered leads?</AlertDialogTitle>
            <AlertDialogDescription>
              {exportEstimateCountHook !== null
                ? `Server reports approximately ${exportEstimateCountHook.toLocaleString()} matching leads.`
                : "Estimating number of matching leads..."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* size warning */}
          {exportEstimateCountHook !== null &&
            exportEstimateCountHook >= EXPORT_WARNING_THRESHOLD && (
              <div className="mx-0 px-4 py-3 rounded-[8px] bg-amber-50 border border-amber-200 text-[13px] text-amber-700 flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>
                  Exporting {exportEstimateCountHook.toLocaleString()} rows may take a while. Consider applying more filters.
                </span>
              </div>
            )}

          {exportEstimateCountHook !== null &&
            exportEstimateCountHook >= EXPORT_REQUIRE_CHECKBOX_THRESHOLD && (
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="export-confirm-checkbox"
                  checked={exportSizeConfirmed}
                  onChange={(e) => setExportSizeConfirmed(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#294998] focus:ring-[#294998] mt-0.5"
                />
                <label
                  htmlFor="export-confirm-checkbox"
                  className="text-[13px] text-slate-700 cursor-pointer"
                >
                  I understand this will export a very large file ({exportEstimateCountHook.toLocaleString()} rows).
                </label>
              </div>
            )}

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setExportConfirmVisibleHook(false);
                setExportSizeConfirmed(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={performExportAll}
              disabled={
                exportEstimateCountHook !== null &&
                exportEstimateCountHook >= EXPORT_REQUIRE_CHECKBOX_THRESHOLD &&
                !exportSizeConfirmed
              }
            >
              Confirm &amp; Export
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LeadsFilters
        showFilters={showFilters}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterAge={filterAge}
        setFilterAge={setFilterAge}
        filterGrade={filterGrade}
        setFilterGrade={setFilterGrade}
        filterLastCall={filterLastCall}
        setFilterLastCall={setFilterLastCall}
        filterClassType={filterClassType}
        setFilterClassType={setFilterClassType}
        filterShift={filterShift}
        setFilterShift={setFilterShift}
        filterDevice={filterDevice}
        setFilterDevice={setFilterDevice}
        filterSubStatus={filterSubStatus}
        setFilterSubStatus={setFilterSubStatus}
        filterPrevCodingExp={filterPrevCodingExp}
        setFilterPrevCodingExp={setFilterPrevCodingExp}
        filterAssignedTo={filterAssignedTo}
        setFilterAssignedTo={setFilterAssignedTo}
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
          setFilterStatus("All");
          setFilterAge("");
          setFilterGrade("");
          setFilterLastCall("");
          setFilterClassType("Class");
          setFilterShift("");
          setFilterDevice("Device");
          setFilterSubStatus("SubStatus");
          setFilterPrevCodingExp("CodingExp");
          setFilterAssignedTo("");
          setSearchTerm("");
          setFilterFollowupDate("");
          setFilterFollowupFrom("");
          setFilterFollowupTo("");
        }}
        users={users}
        usersLoading={usersLoading}
        classTypeOptions={["Class", "Online", "Physical"]}
        deviceOptions={["Device", "Yes", "No"]}
        subStatusOptions={[
            "SubStatus",
            "New",
            "Contacted",
            "Follow-up",
            "Visit scheduled",
            "Demo scheduled",
            "Proposal sent",
            "Interested",
            "On hold",
            "Not interested",
          ]}
        previousCodingExpOptions={[
          "CodingExp",
          "None",
          "Basic Python",
          "Intermediate C++",
          "Arduino",
          "Some Linux",
          "Advanced Python",
          "Basic Java",
          "Other",
        ]}
      />

      {/* Advanced filters handled by `LeadsFilters` component above. Duplicate block removed. */}

      <div className="flex-1 overflow-x-auto bg-white">
        {actionError ? (
          <div className="text-red-500 text-center">{actionError}</div>
        ) : (
          <LeadTableDisplay
            leads={currentLeads}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            leadsPerPage={pageSize}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            handleBulkDelete={handleBulkDelete}
            onStatusChange={handleStatusChange}
            onSubStatusChange={handleSubStatusChange}
            onActivitySave={handleActivitySave}
            onRemarkChange={handleRemarkChange}
            onRecentCallChange={handleLastCallChange}
            onNextCallChange={handleNextCallChange}
            onAgeChange={handleAgeChange}
            onGradeChange={handleGradeChange}
            onCourseDurationChange={handleCourseDurationChange}
            onShiftChange={handleShiftChange}
            // Prop kept as onDemoScheduledChange for backward compatibility with LeadTableDisplay/DraggableRow.
            // Handler now updates canonical scheduled_taken field.
            onDemoScheduledChange={handleScheduledTakenChange}
            onAssignedToChange={handleAssignedToChange}
            authToken={authToken}
            changeLogService={changeLogService}
            users={users}
            usersLoading={usersLoading}
            currentUserRole={(user?.role || "").toString().toLowerCase()}
            handleFieldChange={handleFieldChange}
            handleOpenAddModal={handleOpenAddModal}
            courses={courses}
            handleRefresh={handleRefresh}
          />
        )}
      </div>

      {isEditModalOpen && editingLead && (
        <LeadEditModal
          lead={editingLead}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
          courses={courses}
        />
      )}
      {isAddModalOpen && (
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
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} disabled={archiveProcessing}>
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
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkArchive} disabled={archiveProcessing}>
              {archiveProcessing ? "Moving…" : `Archive ${bulkArchiveConfirmIds?.length ?? 0} Lead(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Leads;
