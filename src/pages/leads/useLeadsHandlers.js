import { useCallback, useState } from "react";
import { resolveServerId, leadService, activityService } from "../../services/api";
import { deduplicateLeads, matchId } from "./utils";
import { SAMPLE_PLACEHOLDER_LEAD } from "./useLeadsCore";

/** Guard: skip server calls for the placeholder sample lead. */
const isSampleLead = (lead) =>
  lead?._id === SAMPLE_PLACEHOLDER_LEAD._id || lead?.id === SAMPLE_PLACEHOLDER_LEAD.id;

export default function useLeadsHandlers(ctx) {
  const { authToken, allLeads, setAllLeads, setToast, setActionError, courses } = ctx;
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

  const updateLeadField = useCallback(
    async (leadId, fieldName, newValue) => {
      const prevLeads = (allLeads || []).slice();
      try {
        let leadObj = (allLeads || []).find((l) => matchId(l, leadId));
        if (isSampleLead(leadObj)) return; // never call server for placeholder
        const serverId = resolveServerId(leadObj || leadId, prevLeads);
        if (!serverId) throw new Error("Unable to resolve Lead ID");

        if (!leadObj) leadObj = prevLeads.find((l) => matchId(l, serverId));

        // Keep the previous sub_status for change-log purposes
        const previousSubStatus = leadObj?.sub_status || "";

        if (
          fieldName === "status" &&
          (newValue === "Lost" || newValue === "Converted")
        ) {
          setAllLeads((prev) =>
            deduplicateLeads(
              prev.map((l) => (matchId(l, serverId) ? { ...l, status: newValue } : l))
            )
          );
        } else {
          // When updating assignment, mirror both assigned_to and assigned_to_username
          if (fieldName === "assigned_to_username" || fieldName === "assigned_to") {
            setAllLeads((prev) =>
              deduplicateLeads(
                prev.map((l) =>
                  matchId(l, serverId)
                    ? {
                        ...l,
                        assigned_to_username: newValue,
                        assigned_to: newValue,
                      }
                    : l
                )
              )
            );
          } else {
            setAllLeads((prev) =>
              deduplicateLeads(
                prev.map((l) => (matchId(l, serverId) ? { ...l, [fieldName]: newValue } : l))
              )
            );
          }
        }

        // Build updates payload. When updating assignment, also pin last_call/next_call
        // to their current values so the backend won't auto-change them.
        let updatesToSend = { [fieldName]: newValue };
        if (fieldName === "assigned_to_username" || fieldName === "assigned_to") {
          const currentLastCall = leadObj?.last_call ?? leadObj?.recentCall ?? null;
          const currentNextCall = leadObj?.next_call ?? leadObj?.nextCall ?? null;
          updatesToSend = {
            assigned_to_username: newValue,
            assigned_to: newValue,
            // Only include dates if they're set; avoid forcing null if unknown
            ...(currentLastCall !== undefined && currentLastCall !== null
              ? { last_call: currentLastCall }
              : {}),
            ...(currentNextCall !== undefined && currentNextCall !== null
              ? { next_call: currentNextCall }
              : {}),
          };
        }
        if (fieldName === "shift") {
          updatesToSend.shift = (newValue || "").toString().trim();
        }

  const serverResp = await leadService.updateLead(serverId, updatesToSend, authToken);

        setToast({ show: true, message: `${fieldName} updated successfully`, type: "success" });

        setAllLeads((prev) =>
          deduplicateLeads(
            prev.map((l) =>
              matchId(l, serverId)
                ? {
                    ...l,
                    ...serverResp,
                    _id: l._id || serverResp.id,
                    // Keep both assignment fields in sync in UI after server responds
                    assigned_to_username:
                      serverResp.assigned_to_username ?? serverResp.assigned_to ?? l.assigned_to_username,
                    assigned_to:
                      serverResp.assigned_to ?? serverResp.assigned_to_username ?? l.assigned_to,
                  }
                : l
            )
          )
        );
        // If status changed to Converted, remove from Leads immediately and broadcast the conversion
        if (
          (fieldName === "status" && newValue === "Converted") ||
          (serverResp && serverResp.status === "Converted")
        ) {
          setAllLeads((prev) => prev.filter((l) => !matchId(l, serverId)));
          try {
            window.dispatchEvent(
              new CustomEvent("crm:leadConverted", {
                detail: { leadId: serverId },
              })
            );
          } catch {}
          setToast({ show: true, message: "Lead converted and moved to Enrolled", type: "success" });
        }

        // If sub_status changed, dispatch a log event
        const normalizedField = (fieldName || "").toLowerCase();
        if (normalizedField === "sub_status") {
          const newSub = serverResp?.sub_status ?? newValue ?? "";
          if (previousSubStatus !== newSub) {
            try {
              window.dispatchEvent(
                new CustomEvent("crm:leadUpdated", {
                  detail: {
                    id: serverId,
                    field_changed: "sub_status",
                    old_value: previousSubStatus || null,
                    new_value: newSub || null,
                  },
                })
              );
            } catch {}
          }
        }
      } catch (err) {
        setAllLeads(prevLeads);
        setToast({ show: true, message: err.message || `Failed to update ${fieldName}`, type: "error" });
      }
    },
    [authToken, allLeads, setAllLeads, setToast]
  );

  const handleAssignedToChange = useCallback(
    (leadId, newAssignedTo) => updateLeadField(leadId, "assigned_to_username", newAssignedTo),
    [updateLeadField]
  );

  const handleActivitySave = useCallback(
    async (leadId, activityData) => {
      const prevLeads = (allLeads || []).slice();
      try {
        let leadObj = (allLeads || []).find((l) => matchId(l, leadId));
        if (isSampleLead(leadObj)) return true; // skip server for placeholder
        const serverId = resolveServerId(leadObj || leadId, prevLeads);
        if (!serverId) throw new Error("Unable to resolve Lead ID");

        if (!leadObj) leadObj = prevLeads.find((l) => matchId(l, serverId));
        const previousSubStatus = leadObj?.sub_status || "";

        const subStatusValue =
          activityData.sub_status ?? activityData.substatus ?? leadObj?.sub_status ?? "New";
        const remarksValue = activityData.remarks ?? leadObj?.remarks ?? "";
        const lastCallValue = activityData.activity_at ?? activityData.last_call ?? null;
        const nextCallValue = activityData.followup_at ?? activityData.next_call ?? null;

        // Optimistically update allLeads
        setAllLeads((prev) =>
          deduplicateLeads(
            prev.map((l) =>
              matchId(l, serverId)
                ? {
                    ...l,
                    substatus: subStatusValue,
                    sub_status: subStatusValue,
                    ...(activityData.source !== undefined ? { source: activityData.source } : {}),
                    ...(lastCallValue ? { last_call: lastCallValue } : {}),
                    ...(nextCallValue ? { next_call: nextCallValue } : {}),
                    remarks: remarksValue,
                  }
                : l
            )
          )
        );

        // 1) Create the activity record with the lead reference so it
        // appears in GET /activities/?lead=<id>.
        const activityPayload = {
          lead: serverId,
          ...(activityData.activity_at ? { activity_at: activityData.activity_at } : {}),
          ...(activityData.type ? { type: activityData.type } : {}),
          sub_status: subStatusValue,
          ...(remarksValue ? { remarks: remarksValue } : {}),
          ...(activityData.followup_at ? { followup_at: activityData.followup_at } : {}),
          ...(activityData.details ? { details: activityData.details } : {}),
        };
        // Backward compat for legacy callers still sending next_call/last_call.
        if (!activityPayload.followup_at && activityData.next_call) {
          activityPayload.followup_at = activityData.next_call;
        }
        if (!activityPayload.activity_at && activityData.last_call) {
          activityPayload.activity_at = activityData.last_call;
        }

        await activityService.createActivity(activityPayload, authToken);

        // 2) Patch the lead so the table stays in sync.
        const updatesToSend = {
          sub_status: subStatusValue,
          remarks: remarksValue,
        };
        if (activityData.source !== undefined) updatesToSend.source = activityData.source;
        if (lastCallValue) updatesToSend.last_call = lastCallValue;
        if (nextCallValue) updatesToSend.next_call = nextCallValue;

        const serverResp = await leadService.updateLead(
          serverId,
          updatesToSend,
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
                    ...serverResp,
                    _id: l._id || serverResp.id,
                    sub_status: serverResp.sub_status ?? subStatusValue,
                    substatus: serverResp.sub_status ?? subStatusValue,
                    source: serverResp.source ?? activityData.source ?? l.source,
                    remarks: serverResp.remarks ?? remarksValue,
                  }
                : l
            )
          )
        );

        // If sub_status changed, dispatch event
        const newSub = serverResp?.sub_status ?? subStatusValue ?? "";
        if (previousSubStatus !== newSub) {
          try {
            window.dispatchEvent(
              new CustomEvent("crm:leadUpdated", {
                detail: {
                  id: serverId,
                  field_changed: "sub_status",
                  old_value: previousSubStatus || null,
                  new_value: newSub || null,
                },
              })
            );
          } catch {}
        }

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
    async (newLeadData) => {
      try {
        const formattedLead = {
          ...newLeadData,
          _id: newLeadData.id?.toString() || newLeadData._id || `new-${Date.now()}`,
          id: newLeadData.id || parseInt(newLeadData._id) || null,
          student_name: newLeadData.student_name?.trim() || "",
          parents_name: newLeadData.parents_name?.trim() || "",
          phone_number: newLeadData.phone_number?.trim() || "",
          whatsapp_number: newLeadData.whatsapp_number?.trim() || "",
          email: newLeadData.email || "",
          age: newLeadData.age || "",
          grade: newLeadData.grade || "",
          source: newLeadData.source || "",
          course_name: newLeadData.course_name || "",
          status: newLeadData.status || "New",
          studentName: newLeadData.student_name?.trim() || "",
          parentsName: newLeadData.parents_name?.trim() || "",
          phone: newLeadData.phone_number?.trim() || "",
          contactWhatsapp: newLeadData.whatsapp_number?.trim() || "",
          created_at: newLeadData.created_at || new Date().toISOString(),
          updated_at: newLeadData.updated_at || new Date().toISOString(),
          logs_url: newLeadData.logs_url || null,
          change_logs: [
            { action: "Created", timestamp: new Date().toISOString(), changes: "New lead created", user: "System" },
          ],
        };

        // Determine if a matching lead already exists BEFORE updating state
        const norm = (v) => (v === undefined || v === null ? "" : String(v).trim().toLowerCase());
        const emailKey = norm(formattedLead.email);
        const namePhoneKey = `${norm(formattedLead.student_name)}-${norm(formattedLead.phone_number)}`;
        const existedBefore = (allLeads || []).some((l) => {
          const lEmail = norm(l.email);
          if (emailKey && lEmail && lEmail === emailKey) return true;
          const lNamePhone = `${norm(l.student_name)}-${norm(l.phone_number)}`;
          return namePhoneKey !== "-" && lNamePhone === namePhoneKey;
        });

        // Avoid duplicate rows when optimistic add is followed by server response:
        // Prefer merging/replacing an existing row matched by natural keys (email or name+phone).
        setAllLeads((prevLeads) => {
          const idx = prevLeads.findIndex((l) => {
            const lEmail = norm(l.email);
            if (emailKey && lEmail && lEmail === emailKey) return true;
            const lNamePhone = `${norm(l.student_name)}-${norm(l.phone_number)}`;
            return namePhoneKey !== "-" && lNamePhone === namePhoneKey;
          });

          let next;
          if (idx >= 0) {
            // Replace/merge the existing optimistic row with the authoritative data (server or refined optimistic)
            next = prevLeads.slice();
            next[idx] = { ...next[idx], ...formattedLead };
          } else {
            next = [formattedLead, ...prevLeads];
          }
          // Remove the sample placeholder now that we have a real lead
          next = next.filter(
            (l) => l._id !== SAMPLE_PLACEHOLDER_LEAD._id && l.id !== SAMPLE_PLACEHOLDER_LEAD.id
          );
          return deduplicateLeads(next);
        });

        // Only show "added" toast if this was a brand new insert (no existing match)
        if (!existedBefore) {
          setToast({ show: true, message: `New lead added: ${formattedLead.student_name}`, type: "success" });
        }
      } catch (error) {
        console.error("Error adding lead:", error);
        setToast({ show: true, message: "Failed to add lead. Please try again.", type: "error" });
      }
    },
    [allLeads, setAllLeads, setToast]
  );

  /**
   * Archive a lead (soft-delete). The caller is responsible for showing
   * a confirmation dialog before invoking this function.
   * On success the lead is removed from the active list and moves to Archive.
   */
  const handleDelete = useCallback(
    async (leadId) => {
      const lead = (allLeads || []).find((l) => matchId(l, leadId));
      if (isSampleLead(lead)) return; // never archive the placeholder
      try {
        const serverId = resolveServerId(lead || leadId, allLeads);
        if (!serverId) throw new Error("Unable to resolve Lead ID");
        await leadService.archiveLead(serverId, authToken);
        setAllLeads((prevLeads) =>
          deduplicateLeads(prevLeads.filter((l) => !matchId(l, leadId)))
        );
        setToast({ show: true, message: "Lead moved to Archive", type: "success" });
        try {
          window.dispatchEvent(new CustomEvent("crm:leadArchived", { detail: { leadId: serverId } }));
        } catch {}
      } catch (err) {
        setActionError(err.message || "Failed to archive lead");
      }
    },
    [authToken, allLeads, setAllLeads, setActionError, setToast]
  );

  /**
   * Bulk archive selected leads using a single backend request.
   */
  const handleBulkDelete = useCallback(
    async (leadIds) => {
      const realIds = (leadIds || []).map((id) => {
        const lead = (allLeads || []).find((l) => matchId(l, id));
        if (isSampleLead(lead)) return null;
        return resolveServerId(lead || id, allLeads);
      }).filter(Boolean);

      if (!realIds.length) return;
      try {
        await leadService.bulkArchiveLeads(realIds, authToken);
        setAllLeads((prevLeads) =>
          deduplicateLeads(prevLeads.filter((lead) => !leadIds.some((id) => matchId(lead, id))))
        );
        setToast({ show: true, message: `${realIds.length} lead(s) moved to Archive`, type: "success" });
      } catch (err) {
        setActionError(err.message || "Failed to archive selected leads");
      }
    },
    [authToken, allLeads, setAllLeads, setActionError, setToast]
  );

  const handleSaveEdit = useCallback(
    async (updatedLead) => {
      const prevLeadsSnapshot = (allLeads || []).slice();
      try {
        setAllLeads((prev) =>
          prev.map((l) => (String(l.id || l._id || "") === String(updatedLead.id || updatedLead._id || "")) ? { ...l, ...updatedLead } : l)
        );

        const serverId = resolveServerId(updatedLead.id || updatedLead._id || {}, prevLeadsSnapshot);
        if (!serverId) throw new Error("Unable to resolve Lead ID");

        const serverResp = await leadService.updateLead(serverId, updatedLead, authToken);

        setAllLeads((prev) => deduplicateLeads(prev.map((l) => (String(l.id || l._id || "") === String(serverResp.id || serverResp._id || "")) ? { ...l, ...serverResp } : l)));

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

    // updates
    updateLeadField,
    handleAssignedToChange,
    handleActivitySave,

    // add/edit/delete
    handleAddNewLead,
    handleSaveEdit,
    handleDelete,
    handleBulkDelete,
  };
}
