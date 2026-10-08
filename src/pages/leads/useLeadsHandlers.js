import { useCallback, useState } from "react";
import { resolveServerId, leadService } from "../../services/api";
import { deduplicateLeads, matchId } from "./utils";
import { SAMPLE_PLACEHOLDER_LEAD } from "./useLeadsCore";

export default function useLeadsHandlers(ctx) {
  const { authToken, allLeads, setAllLeads, setToast, setError, courses } = ctx;
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
        const serverId = resolveServerId(leadObj || leadId, prevLeads);
        if (!serverId) throw new Error("Unable to resolve Lead ID");

        if (!leadObj) leadObj = prevLeads.find((l) => matchId(l, serverId));

        // Keep the previous substatus for change-log purposes
        const previousSubstatus =
          (leadObj?.substatus ?? leadObj?.sub_status ?? "") || "";

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

        // If substatus changed, dispatch a log event so LeadLogDisplay can append an entry immediately
        const normalizedField = (fieldName || "").toLowerCase();
        if (normalizedField === "substatus" || normalizedField === "sub_status") {
          const newSub =
            serverResp?.substatus ?? serverResp?.sub_status ?? newValue ?? "";
          if (previousSubstatus !== newSub) {
            try {
              window.dispatchEvent(
                new CustomEvent("crm:leadUpdated", {
                  detail: {
                    id: serverId,
                    field_changed: "substatus",
                    old_value: previousSubstatus || null,
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

  const handleDelete = useCallback(
    async (leadId) => {
      if (window.confirm("Are you sure you want to move this lead to trash?")) {
        try {
          await leadService.updateLead(leadId, { status: "Lost" }, authToken);
          setAllLeads((prevLeads) => deduplicateLeads(prevLeads.filter((lead) => !matchId(lead, leadId))));
        } catch (err) {
          setError(err.message || "Failed to move lead to trash");
        }
      }
    },
    [authToken, setAllLeads, setError]
  );

  const handleBulkDelete = useCallback(
    async (leadIds) => {
      try {
        await Promise.all(leadIds.map((id) => leadService.updateLead(id, { status: "Lost" }, authToken)));
        setAllLeads((prevLeads) => deduplicateLeads(prevLeads.filter((lead) => !leadIds.some((id) => matchId(lead, id)))));
      } catch (err) {
        setError(err.message || "Failed to move selected leads to trash");
      }
    },
    [authToken, setAllLeads, setError]
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

    // add/edit/delete
    handleAddNewLead,
    handleSaveEdit,
    handleDelete,
    handleBulkDelete,
  };
}
