import { useMemo, useState } from "react";

export default function useEnrollmentFilters(allStudents) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLastPaymentDate, setSearchLastPaymentDate] = useState("");
  const [filterPaymentNotCompleted, setFilterPaymentNotCompleted] = useState(false);
  const [filterScheduledTaken, setFilterScheduledTaken] = useState("");

  const filteredStudents = useMemo(() => {
    if (!allStudents || allStudents.length === 0) return [];
    const q = (searchQuery || "").trim().toLowerCase();
    const dateFilter = (searchLastPaymentDate || "").trim();
    return allStudents.filter((s) => {
      try {
        if (filterPaymentNotCompleted) {
          const pc = s.payment_completed;
          if (pc === true || String(pc) === "true") return false;
        }
        if (dateFilter) {
          const lp = s.last_pay_date || (s.lead && s.lead.last_pay_date) || "";
          const lpDate = lp ? lp.split("T")[0] : "";
          if (lpDate !== dateFilter) return false;
        }
        if (filterScheduledTaken) {
          const schedVal = s.scheduled_taken || s.demo_scheduled || (s.lead && (s.lead.scheduled_taken || s.lead.demo_scheduled)) || "";
          const normalized = String(schedVal).toLowerCase();
          if (filterScheduledTaken === "Yes" && normalized !== "yes" && normalized !== "true") return false;
          if (filterScheduledTaken === "No" && normalized !== "no" && normalized !== "false") return false;
        }
        if (!q) return true;
        const fields = [
          s.student_name,
          s.email,
          s.phone_number,
          s.parents_name,
          s.lead && s.lead.student_name,
          s.lead && s.lead.email,
          s.lead && s.lead.phone_number,
        ];
        return fields.some((f) => (f || "").toString().toLowerCase().includes(q));
      } catch (e) {
        return true;
      }
    });
  }, [allStudents, searchQuery, searchLastPaymentDate, filterPaymentNotCompleted, filterScheduledTaken]);

  return {
    searchQuery, setSearchQuery,
    searchLastPaymentDate, setSearchLastPaymentDate,
    filterPaymentNotCompleted, setFilterPaymentNotCompleted,
    filterScheduledTaken, setFilterScheduledTaken,
    filteredStudents,
  };
}
