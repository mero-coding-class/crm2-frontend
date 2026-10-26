import { useEffect } from "react";
import { RETURNED_TO_LEADS_STORAGE_KEY } from "../clients/returnedToLeadsStore";

export default function useGlobalLeadEvents(
  authToken,
  setToast,
  handleRefresh,
  setAllLeads,
  currentPage = 1
) {
  useEffect(() => {
    if (!authToken) return;
    const importDebounceRef = { current: null };

    const onImported = (e) => {
      const importedCount = e?.detail?.count || e?.detail?.importedCount || 0;
      const message = importedCount > 0
        ? `Successfully imported ${importedCount} leads`
        : "CSV import completed successfully";
      setToast({ show: true, message, type: "success" });
      if (importDebounceRef.current) clearTimeout(importDebounceRef.current);
      importDebounceRef.current = setTimeout(() => {
        handleRefresh().catch((error) => console.warn("Could not refresh imported leads", error));
      }, 700);
    };

    const onLeadCreated = () => {
      handleRefresh(1).catch((error) => console.warn("Could not refresh newly created lead", error));
    };

    const onLeadRestored = () => {
      handleRefresh(currentPage).catch((error) => {
        console.warn("Could not refresh restored leads", error);
      });
    };

    const onApprovalUpdated = () => {
      handleRefresh(currentPage, undefined, { silent: true }).catch((error) => {
        console.warn("Could not refresh leads after an approval decision", error);
      });
    };

    // When a lead is converted (and enrollment is created), remove it from the Leads list immediately
    const onLeadConverted = (e) => {
      try {
        const leadId = String(e?.detail?.leadId ?? e?.detail?.lead?.id ?? e?.detail?.lead?._id ?? "");
        if (!leadId || !setAllLeads) return;
        setAllLeads((prev) => (prev || []).filter((l) => String(l.id ?? l._id ?? "") !== leadId));
        setToast?.({ show: true, type: "success", message: "Lead converted and moved to Enrolled" });
      } catch (err) {
        console.warn("onLeadConverted handler failed:", err);
      }
    };

    const onClientReturnedToLeads = () => {
      handleRefresh(currentPage).catch((error) => {
        console.warn("Could not refresh leads after a client was returned", error);
      });
    };

    const onRemoteChange = () => {
      handleRefresh(currentPage, undefined, { silent: true }).catch((error) => {
        console.warn("Could not refresh leads after a live update", error);
      });
    };

    const onReturnedClientStorageChange = (event) => {
      if (event.key === RETURNED_TO_LEADS_STORAGE_KEY) onClientReturnedToLeads();
    };

    window.addEventListener("crm:imported", onImported);
    window.addEventListener("crm:leadCreated", onLeadCreated);
    window.addEventListener("crm:leadRestored", onLeadRestored);
    window.addEventListener("crm:approvalUpdated", onApprovalUpdated);
    window.addEventListener("crm:leadConverted", onLeadConverted);
    window.addEventListener("crm:clientReturnedToLeads", onClientReturnedToLeads);
    window.addEventListener("crm:remoteChange", onRemoteChange);
    window.addEventListener("storage", onReturnedClientStorageChange);

    return () => {
      window.removeEventListener("crm:imported", onImported);
      window.removeEventListener("crm:leadCreated", onLeadCreated);
      window.removeEventListener("crm:leadRestored", onLeadRestored);
      window.removeEventListener("crm:approvalUpdated", onApprovalUpdated);
      window.removeEventListener("crm:leadConverted", onLeadConverted);
      window.removeEventListener("crm:clientReturnedToLeads", onClientReturnedToLeads);
      window.removeEventListener("crm:remoteChange", onRemoteChange);
      window.removeEventListener("storage", onReturnedClientStorageChange);
      if (importDebounceRef.current) clearTimeout(importDebounceRef.current);
    };
  }, [authToken, setToast, handleRefresh, setAllLeads, currentPage]);

}
