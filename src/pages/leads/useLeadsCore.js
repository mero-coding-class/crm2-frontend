import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config";
import { leadService, courseService } from "../../services/api";
import { deduplicateLeads, ensureLeadIds } from "./utils";

export const SAMPLE_PLACEHOLDER_LEAD = {
  id: 101,
  _id: "lead-sample-101",
  student_name: "Apex Academy International",
  parents_name: "Dr. Rajan Shrestha",
  school_college_name: "Apex Academy International",
  phone_number: "+977 9841234567",
  whatsapp_number: "+977 9841234567",
  email: "principal@apexacademy.edu.np",
  course_name: "Python & AI Curriculum",
  course_duration: "1 Year",
  course_type: "Physical",
  class_type: "Physical",
  shift: "Morning",
  age: "16",
  grade: "Grade 10",
  status: "Active",
  substatus: "Follow-up Needed",
  sub_status: "Follow-up Needed",
  source: "Institutional Visit",
  assigned_to: "Aashish",
  assigned_to_username: "Aashish",
  scheduled_taken: "Yes",
  demo_scheduled: "Yes",
  last_call: "2026-10-06",
  next_call: "2026-10-12",
  remarks: "Principal requested demo presentation for academic board on Friday.",
  city: "Kathmandu",
  address_line_1: "Kathmandu Metro - Ward 10",
  add_date: "2026-10-08",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function useLeadsCore(authToken, pageSize) {
  const [allLeads, setAllLeads] = useState([SAMPLE_PLACEHOLDER_LEAD]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const allLeadsFullRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    // handleRefresh now supports fetching a specific page from backend
    return async function refreshPage(page = 1) {
      if (!authToken) return;
      allLeadsFullRef.current = false;
      setLoading(true);
      setError(null);
      try {
        const [pageResp, coursesData] = await Promise.all([
          leadService.getLeadsPage(authToken, page, pageSize),
          courseService.getCourses(authToken),
        ]);

        const leadsData = pageResp.results || [];

        let processedLeads = (leadsData || [])
          .map((lead) => ({
            ...lead,
            sub_status: lead.sub_status || lead.substatus || "New",
            assigned_to: lead.assigned_to || lead.assigned_to_username || "",
            assigned_to_username:
              lead.assigned_to_username || lead.assigned_to || "",
            course_name: lead.course_name || "N/A",
            course_duration: lead.course_duration || "",
          }));

        // set pagination metadata
        setCurrentPage(page);
        setTotalPages(pageResp.totalPages || 1);

        // If there are any restored leads persisted by TrashPage, prepend them so they appear on top
      try {
        const rawList = localStorage.getItem("crm:restoredLeads");
        const rawOne = localStorage.getItem("crm:restoredLead");
        let restored = [];
        if (rawList) {
          const arr = JSON.parse(rawList);
          if (Array.isArray(arr) && arr.length) restored = arr;
        } else if (rawOne) {
          const obj = JSON.parse(rawOne);
          if (obj && typeof obj === "object") restored = [obj];
        }
        if (restored.length) {
          processedLeads = [...restored, ...processedLeads];
        }
        // Clear persisted flags after merging
        try { localStorage.removeItem("crm:restoredLeads"); } catch {}
        try { localStorage.removeItem("crm:restoredLead"); } catch {}
      } catch {}

        const finalLeads =
          processedLeads.length > 0 ? processedLeads : [SAMPLE_PLACEHOLDER_LEAD];
        setAllLeads(deduplicateLeads(finalLeads));
        return pageResp;
    } catch (err) {
      setError(err.message || "Failed to refresh leads");
        throw err;
    } finally {
      setLoading(false);
    }
    };
  }, [authToken, pageSize]);

  const fetchAllLeads = useCallback(async () => {
    if (!authToken) return [];
    setFetchingAll(true);
    const pageSizeForFetch = 200;
    const baseUrl = `${BASE_URL}/leads/`;
    let page = 1;
    let accumulated = [];
    try {
      while (true) {
        const url = `${baseUrl}?page=${page}&page_size=${pageSizeForFetch}`;
        const resp = await fetch(url, {
          headers: { Authorization: `Token ${authToken}` },
          credentials: "include",
        });
        if (!resp.ok) throw new Error(`Failed to fetch leads page ${page}: ${resp.status}`);
        const json = await resp.json();
        let list = [];
        if (Array.isArray(json)) list = json;
        else if (Array.isArray(json.results)) list = json.results;
        else list = json.data || [];

        if (!list || list.length === 0) break;

        const normalized = ensureLeadIds(list || []);
        accumulated = accumulated.concat(normalized);

        if (list.length < pageSizeForFetch) break;
        page += 1;
      }
      setAllLeads(deduplicateLeads(accumulated));
      allLeadsFullRef.current = true;
      return accumulated;
    } catch (err) {
      console.warn("fetchAllLeads failed:", err);
      throw err;
    } finally {
      setFetchingAll(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    // initial load first page via handleRefresh (keeps behavior close to existing)
    // invoke refreshed function to load page 1
    (async () => {
      try {
        const refresh = await handleRefresh();
        if (typeof refresh === "function") await refresh(1);
      } catch (e) {
        // ignore
      }
    })();
  }, [authToken, handleRefresh]);

  const goToPage = async (page) => {
    if (!authToken) return;
    try {
      const refresh = await handleRefresh();
      if (typeof refresh === "function") await refresh(page);
    } catch (e) {
      console.warn("goToPage failed", e);
    }
  };

  return {
    allLeads,
    setAllLeads,
    loading,
    error,
    setError,
    fetchingAll,
    setFetchingAll,
    allLeadsFullRef,
    handleRefresh,
    fetchAllLeads,
    currentPage,
    totalPages,
    goToPage,
  };
}
