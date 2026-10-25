import { useCallback, useRef, useState } from "react";
import { clientService } from "../../services/api";
import { filterReturnedClients } from "./returnedToLeadsStore";

export default function useEnrollmentsCore(authToken, itemsPerPage, routeFilters = {}) {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const searchQueryRef = useRef("");
  const requestIdRef = useRef(0);

  const fetchEnrolledStudents = useCallback(
    async (page = 1, { silent = false } = {}) => {
      if (!authToken) return;
      const requestId = ++requestIdRef.current;
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await clientService.getClients(authToken, {
          page,
          pageSize: itemsPerPage,
          search: searchQueryRef.current.trim(),
          ...routeFilters,
        });
        if (requestId !== requestIdRef.current) return;

        const list = Array.isArray(response)
          ? response
          : response?.results || response?.data || [];
        const visibleClients = filterReturnedClients(list);

        setAllStudents(visibleClients);
        setCurrentPage(page);
        const count = Array.isArray(response)
          ? response.length
          : response?.count ?? response?.total ?? null;
        setTotalPages(
          count == null
            ? Math.max(1, Math.ceil(list.length / itemsPerPage))
            : Math.max(1, Math.ceil(count / itemsPerPage))
        );
      } catch (fetchError) {
        if (requestId === requestIdRef.current && !silent) {
          setError(fetchError.message || "Failed to load clients");
        }
      } finally {
        if (requestId === requestIdRef.current && !silent) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    },
    [authToken, itemsPerPage, routeFilters]
  );

  return {
    allStudents,
    setAllStudents,
    loading,
    initialLoad,
    error,
    setError,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    searchQueryRef,
    fetchEnrolledStudents,
  };
}
