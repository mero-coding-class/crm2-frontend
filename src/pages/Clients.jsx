// src/pages/Clients.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import PageLoadingState from "../components/common/PageLoadingState.jsx";
import { useAuth } from "../context/useAuth.js";
import ClientsTable from "../components/ClientsTable";
import {
  RefreshCw,
  FileDown,
} from "lucide-react";
import { Button } from "../components/ui/button.jsx";
import Pagination from "../components/common/Pagination.jsx";
import { PageShell, PageHeader } from "../components/common/PageShell.jsx";
import ClientEditModal from "../components/ClientEditModal";
import ClientDetailsModal from "../components/ClientDetailsModal.jsx";
import Toast from "../components/common/Toast";
import { clientService } from "../services/api";

// Modular hooks and components for Clients page
import useEnrollmentsCore from "./clients/useEnrollmentsCore";
import useEnrollmentFilters from "./clients/useEnrollmentFilters";
import useEnrollmentExport from "./clients/useEnrollmentExport";
import useEnrollmentEvents from "./clients/useEnrollmentEvents";
import FiltersPanel from "./clients/FiltersPanel";
import useEnrollmentUpdates from "./clients/useEnrollmentUpdates";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";

const Clients = () => {
  const { authToken, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeSearch = searchParams.get("search") || "";
  const routeFilters = useMemo(() => {
    const filters = {};
    ["owner", "mou_start_from", "mou_start_to", "mou_end_from", "mou_end_to"].forEach((key) => {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    });
    return filters;
  }, [searchParams]);
  const role = user?.role?.toLowerCase();
  const canManageClients = role === "admin";
  const [showFilters, setShowFilters] = useState(false);
  const [leadOwners, setLeadOwners] = useState([]);
  const [filterOptionsError, setFilterOptionsError] = useState("");
  const ITEMS_PER_PAGE = 20;
  // Core paginated state and server fetcher
  const {
    allClients,
    setAllClients,
    loading,
    initialLoad,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    searchQueryRef,
    fetchEnrolledClients,
  } = useEnrollmentsCore(authToken, ITEMS_PER_PAGE, routeFilters);

  // Local UI filters and client-side filtered view
  const {
    searchQuery,
    setSearchQuery,
    filteredClients,
  } = useEnrollmentFilters(allClients, routeSearch);

  searchQueryRef.current = searchQuery;
  useEffect(() => { setSearchQuery(routeSearch); }, [routeSearch, setSearchQuery]);

  // Export
  const { exporting, handleExportEnrollments } = useEnrollmentExport();

  const [editingClient, setEditingClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const currentPageRef = useRef(currentPage);
  const previousSearchQueryRef = useRef(searchQuery);
  currentPageRef.current = currentPage;
  useEffect(() => {
    searchQueryRef.current = searchQuery;
    if (previousSearchQueryRef.current === searchQuery) return undefined;
    previousSearchQueryRef.current = searchQuery;
    const timer = window.setTimeout(() => {
      if (currentPageRef.current === 1) fetchEnrolledClients(1);
      else setCurrentPage(1);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [fetchEnrolledClients, searchQuery, searchQueryRef, setCurrentPage]);

  useEffect(() => {
    if (authToken) fetchEnrolledClients(currentPage);
  }, [authToken, currentPage, fetchEnrolledClients]);

  useEffect(() => {
    if (!authToken) return undefined;
    let cancelled = false;
    clientService.getLeadOwners(authToken)
      .then((owners) => {
        if (cancelled) return;
        setLeadOwners((Array.isArray(owners) ? owners : []).map((owner) => ({
          id: owner.id,
          name: [owner.first_name, owner.last_name].filter(Boolean).join(" ") || owner.username,
        })));
        setFilterOptionsError("");
      })
      .catch((loadError) => {
        if (!cancelled) setFilterOptionsError(loadError.message || "Could not load filter options.");
      });
    return () => { cancelled = true; };
  }, [authToken]);

  useEffect(() => {
    if (Object.keys(routeFilters).length) setShowFilters(true);
  }, [routeFilters]);

  useEnrollmentEvents({
    authToken,
    fetchEnrolledClients,
    currentPage,
  });

  useRealtimeRefresh(authToken, () => {
    fetchEnrolledClients(currentPage, { silent: true });
  });

  useEffect(() => {
    if (!authToken) return undefined;
    let lastRefreshAt = 0;
    const refreshVisiblePage = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshAt < 3000) return;
      lastRefreshAt = now;
      fetchEnrolledClients(currentPage, { silent: true });
    };
    const interval = window.setInterval(refreshVisiblePage, 30000);
    window.addEventListener("focus", refreshVisiblePage);
    document.addEventListener("visibilitychange", refreshVisiblePage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisiblePage);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
  }, [authToken, currentPage, fetchEnrolledClients]);

  const onExport = useCallback(() => {
    handleExportEnrollments({ clients: filteredClients, searchQuery }).catch((exportError) => {
      setToast({ show: true, message: exportError.message || "Could not export clients", type: "error" });
    });
  }, [filteredClients, handleExportEnrollments, searchQuery]);

  const setRouteFilter = useCallback((field, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(field, value);
    else next.delete(field);
    setSearchParams(next, { replace: true });
    setCurrentPage(1);
  }, [searchParams, setSearchParams, setCurrentPage]);

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    ["owner", "mou_start_from", "mou_start_to", "mou_end_from", "mou_end_to"].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
    setCurrentPage(1);
  }, [searchParams, setSearchParams, setCurrentPage]);

  const {
    handleDelete,
    handleBulkDelete,
  } = useEnrollmentUpdates({
    authToken,
    allClients,
    setAllClients,
    setCurrentPage,
    fetchEnrolledClients,
    currentPage,
    setToast,
  });

  // Open edit modal for a client
  const handleEdit = useCallback((client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingClient(null);
  }, []);

  // Show the shared page loader only on the very first load.
  if (initialLoad)
    return <PageLoadingState />;

  if (error) {
    return (
      <div className="m-6 rounded-md bg-rose-50 p-4 text-rose-700" role="alert">
        <p>Could not load clients: {error}</p>
        <button
          type="button"
          onClick={() => fetchEnrolledClients(currentPage)}
          className="mt-2 rounded border border-rose-200 px-3 py-1 text-sm hover:bg-rose-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <PageShell className="flex flex-col">
      <PageHeader
        title="Clients Management"
        description="Manage and track school clients, institutional contracts, and fee structures."
        backTo="/dashboard"
        badge={(
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {allClients.length} on this page
          </span>
        )}
        actions={(
          <>
            <Button
              type="button"
              variant="refresh"
              onClick={() => fetchEnrolledClients(currentPage)}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={onExport}
              disabled={exporting}
            >
              <FileDown className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          </>
        )}
      />

      <FiltersPanel
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onClear={() => setSearchQuery("")}
        loading={loading}
        leadOwners={leadOwners}
        leadOwner={routeFilters.owner || ""}
        onLeadOwnerChange={(value) => setRouteFilter("owner", value)}
        filters={routeFilters}
        onFilterChange={setRouteFilter}
        onClearFilters={clearFilters}
        filterOptionsError={filterOptionsError}
      />

      {/* ─── Clients Table & Content ─── */}
      <div className="p-6">
        <ClientsTable
          clients={filteredClients}
          onViewDetails={setViewingClient}
          canManage={canManageClients}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          handleBulkDelete={handleBulkDelete}
          pagination={totalPages > 0 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              disabled={loading}
              summary={(
                <span>
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {filteredClients.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-900">
                    {(currentPage - 1) * ITEMS_PER_PAGE + filteredClients.length}
                  </span>{" "}
                  on this page
                </span>
              )}
            />
          ) : null}
        />

        {/* Edit Modal */}
        {isModalOpen && editingClient && (
          <ClientEditModal
            isOpen={isModalOpen}
            client={editingClient}
            authToken={authToken}
            onClose={handleCloseModal}
            onSave={() => {
              setIsModalOpen(false);
              setEditingClient(null);
              fetchEnrolledClients(currentPage);
              setToast({
                show: true,
                message: "Client details updated successfully",
                type: "success",
                duration: 3000,
              });
            }}
          />
        )}

        {viewingClient && (
          <ClientDetailsModal
            client={viewingClient}
            authToken={authToken}
            onClose={() => setViewingClient(null)}
          />
        )}

        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration ?? 6000}
            onClose={() =>
              setToast({ show: false, message: "", type: "success" })
            }
          />
        )}
      </div>{/* end p-6 */}
    </PageShell>
  );
};

export default Clients;
