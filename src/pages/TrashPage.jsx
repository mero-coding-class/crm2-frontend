import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/useAuth.js";
import TrashTableDisplay from "../components/TrashDisplayTable.jsx";
import { RefreshCw as ArrowPathIcon, Search as MagnifyingGlassIcon } from "lucide-react";
import { leadService } from "../services/api.js";
import PageLoadingState from "../components/common/PageLoadingState.jsx";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";
import { Button } from "../components/ui/button.jsx";
import { PageShell, PageHeader } from "../components/common/PageShell.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const PAGE_SIZE = 20;
const ADMIN_ROLES = ["admin", "super admin", "superadmin", "super-admin"];

const csvCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const TrashPage = () => {
  const { authToken, user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canRestore = ADMIN_ROLES.includes(role) || role === "b2b";
  const [leads, setLeads] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [restoreConfirmId, setRestoreConfirmId] = useState(null);
  const requestIdRef = useRef(0);

  const fetchLeads = useCallback(async (page, search, { silent = false } = {}) => {
    if (!authToken) return;
    const requestId = ++requestIdRef.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const result = await leadService.getArchivedLeads(authToken, page, PAGE_SIZE, {
        search: search.trim(),
      });
      if (requestId !== requestIdRef.current) return;
      setLeads(result.results);
      setTotalPages(result.totalPages);
      setCurrentPage(page);
    } catch (fetchError) {
      if (requestId === requestIdRef.current && !silent) {
        setError(fetchError.message || "Failed to load archived leads.");
      }
    } finally {
      if (requestId === requestIdRef.current && !silent) setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return undefined;
    const timer = window.setTimeout(() => {
      fetchLeads(currentPage, searchTerm);
    }, searchTerm ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [authToken, currentPage, searchTerm, fetchLeads]);

  useRealtimeRefresh(authToken, () => fetchLeads(currentPage, searchTerm, { silent: true }));

  useEffect(() => {
    if (!authToken) return undefined;
    let lastRefreshAt = 0;
    const refreshVisiblePage = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshAt < 3000) return;
      lastRefreshAt = now;
      fetchLeads(currentPage, searchTerm, { silent: true });
    };
    const interval = window.setInterval(refreshVisiblePage, 30000);
    window.addEventListener("focus", refreshVisiblePage);
    document.addEventListener("visibilitychange", refreshVisiblePage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisiblePage);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
  }, [authToken, currentPage, searchTerm, fetchLeads]);

  const restoreOne = useCallback(async (id) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await leadService.restoreLead(id, authToken);
      window.dispatchEvent(new CustomEvent("crm:leadRestored", { detail: { leadId: id } }));
      const remaining = leads.filter((lead) => lead.id !== id);
      setLeads(remaining);
      setNotice("Lead restored to the active leads list.");
      setRestoreConfirmId(null);
      if (remaining.length === 0 && currentPage > 1) {
        await fetchLeads(currentPage - 1, searchTerm);
      }
    } catch (restoreError) {
      setError(restoreError.message || "Failed to restore lead.");
      setRestoreConfirmId(null);
    } finally {
      setBusy(false);
    }
  }, [authToken, currentPage, fetchLeads, leads, searchTerm]);

  const restoreMany = useCallback(async (ids) => {
    if (!ids.length) return;
    setBusy(true);
    setError("");
    setNotice("");
    const results = await Promise.allSettled(
      ids.map((id) => leadService.restoreLead(id, authToken))
    );
    const restoredIds = new Set(
      ids.filter((_, index) => results[index].status === "fulfilled")
    );
    const failedCount = results.length - restoredIds.size;
    setLeads((current) => current.filter((lead) => !restoredIds.has(lead.id)));
    if (restoredIds.size) {
      window.dispatchEvent(new CustomEvent("crm:leadRestored", { detail: { leadIds: [...restoredIds] } }));
    }
    if (restoredIds.size) {
      setNotice(`Restored ${restoredIds.size} lead${restoredIds.size === 1 ? "" : "s"}.`);
    }
    if (failedCount) setError(`Could not restore ${failedCount} selected lead${failedCount === 1 ? "" : "s"}.`);
    setBusy(false);
    if (leads.length === restoredIds.size && currentPage > 1) {
      await fetchLeads(currentPage - 1, searchTerm);
    }
  }, [authToken, currentPage, fetchLeads, leads.length, searchTerm]);

  const exportCurrentPage = () => {
    if (!leads.length) return;
    const columns = [
      ["system_id", "System ID"],
      ["school_name", "School Name"],
      ["district", "District"],
      ["municipality", "Municipality"],
      ["contact_person", "Contact Person"],
      ["contact_number", "Contact Number"],
      ["status", "Status"],
      ["archive_reason", "Archive Reason"],
    ];
    const csv = [
      columns.map(([, label]) => csvCell(label)).join(","),
      ...leads.map((lead) => columns.map(([key]) => csvCell(lead[key])).join(",")),
    ].join("\r\n");
    const objectUrl = window.URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `archived-leads-page-${currentPage}.csv`;
    link.click();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
  };

  if (loading && leads.length === 0) {
    return <PageLoadingState />;
  }

  return (
    <PageShell width="wide" className="text-slate-900">
      <PageHeader
        title="Archived Leads"
        description="Archived records are read-only. Admins and lead owners can restore them."
        actions={(
          <>
          <Button type="button" variant="refresh" disabled={loading || busy} onClick={() => fetchLeads(currentPage, searchTerm)}>
            <ArrowPathIcon className="h-4 w-4" /> Refresh
          </Button>
          <Button type="button" variant="secondary" disabled={!leads.length} onClick={exportCurrentPage}>Export page</Button>
          </>
        )}
      />

      <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={searchTerm} onChange={(event) => { setCurrentPage(1); setSearchTerm(event.target.value); }} placeholder="Search archived school names…" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
        </div>
        {loading && leads.length > 0 && <span className="text-xs text-slate-500">Refreshing…</span>}
      </div>

      {error && <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <TrashTableDisplay
        leads={leads}
        canRestore={canRestore}
        onRestoreLead={setRestoreConfirmId}
        onBulkRestore={restoreMany}
        busy={busy || loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => fetchLeads(page, searchTerm)}
      />

      <AlertDialog open={!!restoreConfirmId} onOpenChange={(open) => { if (!open) setRestoreConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this lead?</AlertDialogTitle>
            <AlertDialogDescription>The lead will return to the active leads list with its status reset by the server.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => restoreOne(restoreConfirmId)}>
              {busy ? "Restoring…" : "Restore lead"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PageShell>
  );
};

export default TrashPage;
