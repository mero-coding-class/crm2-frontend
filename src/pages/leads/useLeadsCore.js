import { useCallback, useEffect, useRef, useState } from "react";
import { leadService } from "../../services/api";
import { deduplicateLeads } from "./utils";

export default function useLeadsCore(authToken, pageSize) {
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const activeFiltersRef = useRef({});
  const pageRequestIdRef = useRef(0);

  const handleRefresh = useCallback(
    async (page = 1, filters, { silent = false } = {}) => {
      const pageNum = typeof page === "number" ? page : 1;
      if (!authToken) return;
      const requestId = ++pageRequestIdRef.current;
      if (filters !== undefined) activeFiltersRef.current = filters || {};
      if (!silent) setLoading(true);
      if (!silent) setError(null);
      try {
        const pageResp = await leadService.getLeadsPage(
          authToken,
          pageNum,
          pageSize,
          activeFiltersRef.current
        );
        if (requestId !== pageRequestIdRef.current) return;
        const leadsData = pageResp?.results || [];

        // set pagination metadata
        setCurrentPage(pageNum);
        setTotalPages(pageResp?.totalPages || 1);

        setAllLeads(deduplicateLeads(leadsData));
        return pageResp;
      } catch (err) {
        if (requestId === pageRequestIdRef.current && !silent) {
          setError(err.message || "Failed to refresh leads");
        }
        throw err;
      } finally {
        if (requestId === pageRequestIdRef.current && !silent) setLoading(false);
      }
    },
    [authToken, pageSize]
  );

  const fetchAllLeads = useCallback(async (filters) => {
    if (!authToken) return [];
    setFetchingAll(true);
    const pageSizeForFetch = 100;
    const queryFilters = filters ?? activeFiltersRef.current;
    let page = 1;
    let accumulated = [];
    try {
      while (true) {
        const response = await leadService.getLeadsPage(
          authToken,
          page,
          pageSizeForFetch,
          queryFilters
        );
        const list = response.results || [];
        accumulated = accumulated.concat(list);
        if (page >= response.totalPages || list.length === 0) break;
        page += 1;
      }
      const normalized = deduplicateLeads(accumulated);
      return normalized;
    } catch (err) {
      console.warn("fetchAllLeads failed:", err);
      throw err;
    } finally {
      setFetchingAll(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    handleRefresh(1).catch(() => {});
  }, [authToken, handleRefresh]);

  const goToPage = async (page) => {
    if (!authToken) return;
    try {
      await handleRefresh(page);
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
    handleRefresh,
    fetchAllLeads,
    currentPage,
    totalPages,
    goToPage,
  };
}
