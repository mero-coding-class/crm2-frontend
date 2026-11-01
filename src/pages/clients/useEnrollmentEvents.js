import { useEffect } from "react";
import { RETURNED_TO_LEADS_STORAGE_KEY } from "./returnedToLeadsStore";

export default function useEnrollmentEvents({ authToken, fetchEnrolledClients, currentPage }) {
  useEffect(() => {
    if (!authToken) return undefined;

    const onLeadConverted = () => {
      fetchEnrolledClients(currentPage);
    };
    const onReturnedLeadStorageChange = (event) => {
      if (event.key === RETURNED_TO_LEADS_STORAGE_KEY) {
        fetchEnrolledClients(currentPage);
      }
    };

    window.addEventListener("crm:leadConverted", onLeadConverted);
    window.addEventListener("storage", onReturnedLeadStorageChange);
    return () => {
      window.removeEventListener("crm:leadConverted", onLeadConverted);
      window.removeEventListener("storage", onReturnedLeadStorageChange);
    };
  }, [authToken, currentPage, fetchEnrolledClients]);
}
