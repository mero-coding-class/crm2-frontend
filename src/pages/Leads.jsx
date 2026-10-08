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
    error,
    setError,
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
    updateLeadField,
    handleAssignedToChange,
    handleAddNewLead,
    handleSaveEdit,
    handleDelete,
    handleBulkDelete,
  } = useLeadsHandlers({
    authToken,
    allLeads,
    setAllLeads,
    setToast,
    setError,
    courses,
  });

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
      updateLeadField(leadId, "substatus", newSubStatus),
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

  let currentLeads = deduplicateLeads([...searchedLeads]);
  if (!isAdmin) {
    const username =
      (user && user.username) || localStorage.getItem("username") || "";
    const normalizedUsername = String(username).trim().toLowerCase();
    currentLeads = currentLeads.filter((lead) => {
      // consider the lead assigned to current user if normalized matches
      const aNorm = (lead.assigned_to_normalized || "")
        .toString()
        .trim()
        .toLowerCase();
      const auNorm = (lead.assigned_to_username_normalized || "")
        .toString()
        .trim()
        .toLowerCase();
      const isAssigned =
        normalizedUsername &&
        (aNorm === normalizedUsername || auNorm === normalizedUsername);

      return (
        isAssigned || (lead.status !== "Converted" && lead.status !== "Lost")
      );
    });
  }

  if (!isAdmin) {
    const username =
      (user && user.username) || localStorage.getItem("username") || "";
    const normalizedUsername = String(username).trim().toLowerCase();
    if (normalizedUsername) {
      currentLeads = currentLeads.filter((lead) => {
        // Use normalized assigned fields when available (set during fetch)
        const aNorm = (lead.assigned_to_normalized || "").trim().toLowerCase();
        const auNorm = (lead.assigned_to_username_normalized || "")
          .trim()
          .toLowerCase();
        // Fallback to raw fields
        const aRaw = String(lead.assigned_to || "").trim();
        const auRaw = String(lead.assigned_to_username || "").trim();

        return (
          (aNorm && aNorm === normalizedUsername) ||
          (auNorm && auNorm === normalizedUsername) ||
          (aRaw && aRaw === username) ||
          (auRaw && auRaw === username)
        );
      });
    }
  }

  // If there are no leads yet, provide the placeholder sample lead so the table structure is visible
  if ((!currentLeads || currentLeads.length === 0) && !searchTerm.trim()) {
    currentLeads = [SAMPLE_PLACEHOLDER_LEAD];
  }

  // removed noisy debug logging

  if (loading) {
    return <DelayedLoader message="Loading leads..." minMs={2000} />;
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        <p>Error: {error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
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

      {/* Export All confirmation modal */}
      {exportConfirmVisibleHook && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 w-11/12 max-w-md">
            <h3 className="text-lg font-semibold mb-2">
              Export all filtered leads?
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              {exportEstimateCountHook !== null
                ? `Server reports ~${exportEstimateCountHook} matching leads.`
                : "Estimating number of matching leads..."}
            </p>
            {/* size warning */}
            {exportEstimateCountHook !== null &&
              exportEstimateCountHook >= EXPORT_WARNING_THRESHOLD && (
                <div className="mb-4 p-3 rounded-md bg-yellow-50 border-l-4 border-yellow-300 text-yellow-800">
                  Exporting a large dataset ({exportEstimateCountHook} rows) may
                  take a while and produce a large file. Consider filtering
                  further or using the backend export endpoint if available.
                </div>
              )}
            {exportEstimateCountHook !== null &&
              exportEstimateCountHook >= EXPORT_REQUIRE_CHECKBOX_THRESHOLD && (
                <div className="mb-4 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="export-confirm-checkbox"
                    checked={exportSizeConfirmed}
                    onChange={(e) => setExportSizeConfirmed(e.target.checked)}
                  />
                  <label
                    htmlFor="export-confirm-checkbox"
                    className="text-sm text-gray-700"
                  >
                    I understand this will export a very large file (
                    {exportEstimateCountHook} rows).
                  </label>
                </div>
              )}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setExportConfirmVisibleHook(false);
                  setExportSizeConfirmed(false);
                }}
                className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={performExportAll}
                disabled={
                  exportEstimateCountHook !== null &&
                  exportEstimateCountHook >=
                    EXPORT_REQUIRE_CHECKBOX_THRESHOLD &&
                  !exportSizeConfirmed
                }
                className={`px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 ${
                  exportEstimateCountHook !== null &&
                  exportEstimateCountHook >=
                    EXPORT_REQUIRE_CHECKBOX_THRESHOLD &&
                  !exportSizeConfirmed
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
              >
                Confirm & Export
              </button>
            </div>
          </div>
        </div>
      )}

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
        }}
        users={users}
        usersLoading={usersLoading}
        classTypeOptions={["Class", "Online", "Physical"]}
        deviceOptions={["Device", "Yes", "No"]}
        subStatusOptions={[
          "SubStatus",
          "New",
          "Open",
          "Followup",
          "inProgress",
          "Average",
          "Interested",
          "Junk",
          "NextBatch",
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
        {error ? (
          <div className="text-red-500 text-center">{error}</div>
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
    </div>
  );
};

export default Leads;
