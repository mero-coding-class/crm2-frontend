import { useCallback, useState } from "react";
import { resolveServerId, leadService, activityService } from "../../services/api";
import { deduplicateLeads, matchId } from "./utils";

export default function useLeadsHandlers(ctx) {
  const { authToken, allLeads, setAllLeads, setToast } = ctx;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const handleOpenAddModal = useCallback(() => setIsAddModalOpen(true), []);
  const handleCloseAddModal = useCallback(() => setIsAddModalOpen(false), []);

  const handleEdit = useCallback((lead) => {
    setEditingLead(lead);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingLead(null);
  }, []);

  const handleActivitySave = useCallback(
    async (leadId, activityData) => {
      const prevLeads = (allLeads || []).slice();
      try {
        let leadObj = (allLeads || []).find((l) => matchId(l, leadId));
        const serverId = resolveServerId(leadObj || leadId);
        if (!serverId) throw new Error("Unable to resolve Lead ID");

        await activityService.createActivity(
          {
            lead: serverId,
            activity_at: activityData.activity_at,
            type: activityData.type,
            sub_status: activityData.sub_status,
            remarks: activityData.remarks,
            followup_at: activityData.followup_at,
          },
          authToken
        );

        setToast({
          show: true,
          message: "Activity updated successfully",
          type: "success",
        });

        setAllLeads((prev) =>
          deduplicateLeads(
            prev.map((l) =>
              matchId(l, serverId)
                ? {
                    ...l,
                    sub_status: activityData.sub_status ?? l.sub_status,
                    substatus: activityData.sub_status ?? l.substatus,
                  }
                : l
            )
          )
        );

        return true;
      } catch (err) {
        setAllLeads(prevLeads);
        setToast({
          show: true,
          message: err.message || "Failed to update activity",
          type: "error",
        });
        throw err;
      }
    },
    [authToken, allLeads, setAllLeads, setToast]
  );

  const handleAddNewLead = useCallback(
    async (createdLead) => {
      if (!createdLead?.id) throw new Error("The server did not return the created lead.");
      setToast({
        show: true,
        message: `Lead ${createdLead.system_id || createdLead.school_name} created`,
        type: "success",
      });
      window.dispatchEvent(new CustomEvent("crm:leadCreated", { detail: { lead: createdLead } }));
    },
    [setToast]
  );

  /**
   * Archive a lead (soft-delete). The caller is responsible for showing
   * a confirmation dialog before invoking this function.
   * On success the lead is removed from the active list and moves to Archive.
   */
  const handleDelete = useCallback(
    async (leadId, archiveDetails = {}) => {
      const lead = (allLeads || []).find((l) => matchId(l, leadId));
      try {
        const serverId = resolveServerId(lead || leadId);
        if (!serverId) throw new Error("Unable to resolve Lead ID");
        const reason = (archiveDetails.reason || "").trim();
        if (!reason) throw new Error("An archive reason is required.");
        await leadService.archiveLead(
          serverId,
          authToken,
          reason,
          Boolean(archiveDetails.nextYearProbability)
        );
        setAllLeads((prevLeads) =>
          deduplicateLeads(prevLeads.filter((l) => !matchId(l, leadId)))
        );
        setToast({ show: true, message: "Lead moved to Archive", type: "success" });
      } catch (err) {
        setToast({ show: true, message: err.message || "Failed to archive lead", type: "error" });
      }
    },
    [authToken, allLeads, setAllLeads, setToast]
  );

  /**
   * Bulk archive selected leads using a single backend request.
   */
  const handleBulkDelete = useCallback(
    async (leadIds, archiveDetails = {}) => {
      const realIds = (leadIds || []).map((id) => {
        const lead = (allLeads || []).find((l) => matchId(l, id));
        return resolveServerId(lead || id);
      }).filter(Boolean);

      if (!realIds.length) return;
      try {
        const reason = (archiveDetails.reason || "").trim();
        if (!reason) throw new Error("An archive reason is required.");
        const response = await leadService.bulkArchiveLeads(
          realIds,
          authToken,
          reason,
          Boolean(archiveDetails.nextYearProbability)
        );
        const archivedIds = Array.isArray(response?.results)
          ? response.results
              .filter((item) => item?.result === "archived")
              .map((item) => String(item.id))
          : realIds.map(String);
        const archivedSet = new Set(archivedIds);
        setAllLeads((prevLeads) =>
          deduplicateLeads(
            prevLeads.filter((lead) => {
              const serverId = resolveServerId(lead);
              return serverId == null || !archivedSet.has(String(serverId));
            })
          )
        );
        const skippedCount = Math.max(0, realIds.length - archivedIds.length);
        setToast({
          show: true,
          message: skippedCount
            ? `${archivedIds.length} lead(s) archived; ${skippedCount} could not be archived.`
            : `${archivedIds.length} lead(s) moved to Archive`,
          type: skippedCount && archivedIds.length === 0 ? "error" : "success",
        });
      } catch (err) {
        setToast({ show: true, message: err.message || "Failed to archive selected leads", type: "error" });
      }
    },
    [authToken, allLeads, setAllLeads, setToast]
  );

  const handleSaveEdit = useCallback(
    async (updatedLead) => {
      const prevLeadsSnapshot = (allLeads || []).slice();
      try {
        const serverId = resolveServerId(updatedLead);
        if (!serverId) throw new Error("Unable to resolve Lead ID");

        const writableFields = [
          "school_name", "district", "municipality", "address",
          "contact_person", "contact_number", "alt_number", "alt_contact_person",
          "email", "source", "course_interest", "social_media", "sub_status",
        ];
        const payload = Object.fromEntries(
          writableFields
            .filter((field) => Object.prototype.hasOwnProperty.call(updatedLead, field))
            .map((field) => [field, updatedLead[field]])
        );
        if (!Object.keys(payload).length) throw new Error("No editable fields were provided.");

        setAllLeads((prev) => prev.map((lead) =>
          matchId(lead, serverId) ? { ...lead, ...payload } : lead
        ));

        const serverResp = await leadService.updateLead(serverId, payload, authToken);

        setAllLeads((prev) => deduplicateLeads(prev.map((lead) =>
          matchId(lead, serverId) ? { ...lead, ...serverResp } : lead
        )));

        setToast({ show: true, message: "Lead updated successfully", type: "success", duration: 3000 });
        setIsEditModalOpen(false);
        setEditingLead(null);
      } catch (err) {
        setAllLeads(prevLeadsSnapshot);
        setToast({ show: true, message: err.message || "Failed to update lead", type: "error" });
      }
    },
    [authToken, allLeads, setAllLeads, setToast]
  );

  return {
    // modal states
    isEditModalOpen,
    setIsEditModalOpen,
    isAddModalOpen,
    setIsAddModalOpen,
    editingLead,
    setEditingLead,

    // open/close
    handleOpenAddModal,
    handleCloseAddModal,
    handleEdit,
    handleCloseEditModal,

    handleActivitySave,

    // add/edit/delete
    handleAddNewLead,
    handleSaveEdit,
    handleDelete,
    handleBulkDelete,
  };
}
