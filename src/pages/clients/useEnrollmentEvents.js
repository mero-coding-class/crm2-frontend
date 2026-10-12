import { useEffect, useRef } from "react";

export default function useEnrollmentEvents({ authToken, fetchEnrolledStudents, currentPage, setAllStudents, setError, setToast, students, handleUpdateFieldRef }) {
  const allStudentsRef = useRef([]);

  useEffect(() => {
    if (!authToken) return;
    const importDebounce = { timeoutId: null };

    const onImported = () => {
      if (importDebounce.timeoutId) clearTimeout(importDebounce.timeoutId);
      importDebounce.timeoutId = setTimeout(() => {
        fetchEnrolledStudents(currentPage);
        importDebounce.timeoutId = null;
      }, 700);
    };

    const onLeadInvoicesSelected = async (e) => {
      try {
        const detail = e?.detail || {};
        const leadId = detail.leadId;
        const files = detail.files || [];
        if (!leadId || !files.length) return;
        const target = (allStudentsRef.current || []).find(
          (s) => s?.lead && (String(s.lead.id) === String(leadId) || String(s.lead._id) === String(leadId))
        );
        if (!target) return;
        // Build invoice payload and attempt inline upload via update handler if available
        const today = new Date().toISOString().split("T")[0];
        const invoice = files.map((file) => ({ name: file.name, date: today, file }));
        const fn = handleUpdateFieldRef && handleUpdateFieldRef.current;
        if (typeof fn === "function") {
          try { await fn(target.id, "invoice", { invoice }); } catch {}
        }
        await fetchEnrolledStudents(currentPage);
      } catch (err) {
        console.debug("onLeadInvoicesSelected failed", err);
      }
    };

    const onLeadConverted = () => {
      try { fetchEnrolledStudents(currentPage); } catch {}
    };
    const onRefreshEnrollments = () => {
      try { fetchEnrolledStudents(currentPage); } catch {}
    };

    window.addEventListener("crm:imported", onImported);
    window.addEventListener("crm:leadInvoicesSelected", onLeadInvoicesSelected);
    window.addEventListener("crm:leadConverted", onLeadConverted);
    window.addEventListener("crm:refreshEnrollments", onRefreshEnrollments);

    return () => {
      window.removeEventListener("crm:imported", onImported);
      window.removeEventListener("crm:leadInvoicesSelected", onLeadInvoicesSelected);
      window.removeEventListener("crm:leadConverted", onLeadConverted);
      window.removeEventListener("crm:refreshEnrollments", onRefreshEnrollments);
    };
  }, [authToken, fetchEnrolledStudents, currentPage, setError, setToast]);

  useEffect(() => {
    allStudentsRef.current = Array.isArray(students) ? students : [];
  }, [students]);
}
