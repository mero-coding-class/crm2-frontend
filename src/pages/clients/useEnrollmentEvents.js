import { useEffect } from "react";
import { RETURNED_TO_LEADS_STORAGE_KEY } from "./returnedToLeadsStore";

export default function useEnrollmentEvents({ authToken, fetchEnrolledStudents, currentPage }) {
  useEffect(() => {
    if (!authToken) return undefined;

    const onLeadConverted = () => {
      fetchEnrolledStudents(currentPage);
    };
    const onReturnedLeadStorageChange = (event) => {
      if (event.key === RETURNED_TO_LEADS_STORAGE_KEY) {
        fetchEnrolledStudents(currentPage);
      }
    };

    window.addEventListener("crm:leadConverted", onLeadConverted);
    window.addEventListener("storage", onReturnedLeadStorageChange);
    return () => {
      window.removeEventListener("crm:leadConverted", onLeadConverted);
      window.removeEventListener("storage", onReturnedLeadStorageChange);
    };
  }, [authToken, currentPage, fetchEnrolledStudents]);
}
