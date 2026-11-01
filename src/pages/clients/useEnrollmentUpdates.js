import { useCallback } from "react";
import { clientService } from "../../services/api";
import { rememberReturnedLeadIds } from "./returnedToLeadsStore";

const normalizeReturnedLeadId = (client) =>
  client?.lead_id ??
  client?.lead?.id ??
  client?.lead?._id ??
  client?.leadId ??
  client?.lead?.lead_id;

const emitReturnedToLeads = (leadId) => {
  try {
    window.dispatchEvent(
      new CustomEvent("crm:clientReturnedToLeads", { detail: { leadId } })
    );
  } catch {
    // The server update has already succeeded; an unavailable event target is non-fatal.
  }
};

export default function useEnrollmentUpdates({
  authToken,
  allClients,
  setAllClients,
  setCurrentPage,
  fetchEnrolledClients,
  currentPage,
  setToast,
}) {
  const handleDelete = useCallback(
    async (clientId) => {
      const client = (allClients || []).find((item) => String(item.id) === String(clientId));
      const leadId = normalizeReturnedLeadId(client);
      if (leadId === null || leadId === undefined) {
        setToast({ show: true, message: "Could not find the lead linked to this client.", type: "error" });
        return;
      }

      try {
        await clientService.returnToLeads(leadId, authToken);
        rememberReturnedLeadIds([leadId]);
        setAllClients((clients) =>
          (clients || []).filter((item) => String(item.id) !== String(clientId))
        );
        setToast({ show: true, message: "Client returned to Leads", type: "success" });
        emitReturnedToLeads(leadId);

        const remainingOnPage = (allClients || []).filter(
          (item) => String(item.id) !== String(clientId)
        ).length;
        const pageAfterReturn = currentPage > 1 && remainingOnPage === 0
          ? currentPage - 1
          : currentPage;
        if (pageAfterReturn === currentPage) await fetchEnrolledClients(currentPage);
        else setCurrentPage(pageAfterReturn);
      } catch (error) {
        setToast({ show: true, message: error.message || "Could not return client to Leads", type: "error" });
      }
    },
    [allClients, authToken, currentPage, fetchEnrolledClients, setAllClients, setCurrentPage, setToast]
  );

  const handleBulkDelete = useCallback(
    async (ids = []) => {
      if (!ids.length) return;
      const selectedIds = new Set(ids.map(String));
      const selected = (allClients || []).filter((client) => selectedIds.has(String(client.id)));
      const results = await Promise.allSettled(
        selected.map(async (client) => {
          const leadId = normalizeReturnedLeadId(client);
          if (leadId === null || leadId === undefined) {
            throw new Error(`Could not find the lead linked to client ${client.id}.`);
          }
          await clientService.returnToLeads(leadId, authToken);
          return { clientId: client.id, leadId };
        })
      );

      const returned = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      const returnedClientIds = new Set(returned.map(({ clientId }) => String(clientId)));
      const failedCount = results.length - returned.length;

      if (returned.length) {
        rememberReturnedLeadIds(returned.map(({ leadId }) => leadId));
        setAllClients((clients) =>
          (clients || []).filter((client) => !returnedClientIds.has(String(client.id)))
        );
        returned.forEach(({ leadId }) => emitReturnedToLeads(leadId));

        const remainingOnPage = (allClients || []).filter(
          (client) => !returnedClientIds.has(String(client.id))
        ).length;
        const pageAfterReturn = currentPage > 1 && remainingOnPage === 0
          ? currentPage - 1
          : currentPage;
        if (pageAfterReturn === currentPage) await fetchEnrolledClients(currentPage);
        else setCurrentPage(pageAfterReturn);
      }

      setToast({
        show: true,
        message: failedCount
          ? `${returned.length} client(s) returned to Leads; ${failedCount} could not be moved.`
          : `${returned.length} client(s) returned to Leads`,
        type: failedCount && !returned.length ? "error" : "success",
      });
    },
    [allClients, authToken, currentPage, fetchEnrolledClients, setAllClients, setCurrentPage, setToast]
  );

  return { handleDelete, handleBulkDelete };
}
