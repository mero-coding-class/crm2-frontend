import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config";

export default function useEnrollmentsCore(authToken, ITEMS_PER_PAGE) {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const searchQueryRef = useRef("");
  const searchLastPaymentDateRef = useRef("");
  const filterPaymentNotCompletedRef = useRef(false);
  const filterScheduledTakenRef = useRef("");

  const fetchEnrolledStudents = useCallback(
    async (page = 1) => {
      if (!authToken) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("page_size", String(ITEMS_PER_PAGE));
        const sq = searchQueryRef.current;
        const slp = searchLastPaymentDateRef.current;
        const fNotCompleted = filterPaymentNotCompletedRef.current;
        const fDemo = filterScheduledTakenRef.current;
        if (sq && sq.trim()) params.append("search", sq.trim());
        if (slp && slp.trim()) params.append("last_pay_date", slp.trim());
        if (fNotCompleted) params.append("payment_completed", "false");
        if (fDemo && (fDemo === "Yes" || fDemo === "No")) {
          params.append("scheduled_taken", fDemo === "Yes" ? "true" : "false");
        }

        const url = `${BASE_URL}/enrollments/?${params.toString()}`;
        const resp = await fetch(url, {
          headers: { Authorization: `Token ${authToken}` },
          credentials: "include",
        });
        if (!resp.ok) throw new Error(`Failed to fetch enrollments: ${resp.status}`);
        const json = await resp.json();
        let list = [];
        let count = null;
        if (Array.isArray(json)) {
          list = json;
          count = json.length;
        } else if (Array.isArray(json.results)) {
          list = json.results;
          count = json.count ?? null;
        } else if (Array.isArray(json.data)) {
          list = json.data;
          count = json.count ?? null;
        }

        const normalizedList = (list || []).map((item) => ({
          ...item,
          student_name: item.school_name || item.student_name || "School",
          parents_name: item.principal_name || item.parents_name || "—",
          email: item.contact_email || item.principal_email || item.email || "—",
          phone_number: item.contact_number || item.principal_number || item.phone_number || "—",
          course_name: item.package_name || item.course_name || "Standard",
          total_payment: item.agreed_price != null ? `NPR ${item.agreed_price}` : item.total_payment || "—",
          payment_type: item.pricing_basis === "per_month" ? "Per Month" : (item.pricing_basis === "per_class" ? "Per Class" : item.payment_type || "—"),
          starting_date: item.mou_start || item.starting_date || "—",
          batchname: item.classes_per_week ? `${item.classes_per_week} classes/wk` : item.batchname || "—",
          assigned_teacher: item.assigned_to_name || item.assigned_teacher || "—",
          course_duration: item.mou_start && item.mou_end ? `${item.mou_start} ~ ${item.mou_end}` : item.course_duration || "—",
          last_pay_date: item.last_pay_date || "",
          next_pay_date: item.next_pay_date || "",
          payment_completed: Boolean(item.payment_completed),
        }));

        const seen = new Set();
        const deduped = normalizedList.filter((item) => {
          const id = item && (item.id || item._id);
          if (id == null) return true;
          const key = String(id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAllStudents(deduped);
        setCurrentPage(page);
        if (count != null) {
          setTotalPages(Math.max(1, Math.ceil(count / ITEMS_PER_PAGE)));
        } else {
          setTotalPages(Math.max(1, Math.ceil((list || []).length / ITEMS_PER_PAGE)));
        }
      } catch (err) {
        console.error("Failed to fetch enrollments page:", err);
        setError(err.message || "Failed to load enrollments");
      } finally {
        setLoading(false);
        if (initialLoad) setInitialLoad(false);
      }
    },
    [authToken, ITEMS_PER_PAGE, initialLoad]
  );

  return {
    // state
    allStudents,
    setAllStudents,
    loading,
    setLoading,
    initialLoad,
    setInitialLoad,
    error,
    setError,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    // filters refs for debounced fetchers
    searchQueryRef,
    searchLastPaymentDateRef,
    filterPaymentNotCompletedRef,
    filterScheduledTakenRef,
    // actions
    fetchEnrolledStudents,
  };
}
