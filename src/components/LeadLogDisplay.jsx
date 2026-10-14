// src/components/LeadLogDisplay.jsx
// Task 3.3: Activity Log display — show Substatus, Followup Date, Remarks
// After saving, only show the latest contact log in the front/preview (collapse older)
import React, { useState, useEffect, useCallback } from "react";
import { getFormattedDate, formatTimestamp } from "./helpers";

const LeadLogDisplay = ({
  leadId,
  authToken,
  changeLogService,
  refreshKey,
}) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const syntheticRef = React.useRef([]);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedLogs = await changeLogService.getLeadLogs(
          leadId,
          authToken
        );
        const sorted = (
          Array.isArray(fetchedLogs) ? fetchedLogs : fetchedLogs?.results || []
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const synths = syntheticRef.current || [];
        if (synths.length === 0) {
          setLogs(sorted);
        } else {
          const topServer = sorted[0];
          const matched =
            topServer &&
            synths.some((s) => s.new_value === topServer.new_value);
          if (matched) {
            syntheticRef.current = [];
            setLogs(sorted);
          } else {
            setLogs([...synths, ...sorted]);
          }
        }
      } catch (err) {
        setError(err.message || "Failed to fetch logs.");
      } finally {
        setLoading(false);
      }
    };
    if (leadId && authToken && changeLogService) fetchLogs();
  }, [leadId, authToken, changeLogService, refreshKey]);

  // Listen for optimistic remark updates
  useEffect(() => {
    const onRemarkUpdated = (e) => {
      try {
        const { id, remarks } = e?.detail || {};
        if (!id || String(id) !== String(leadId)) return;
        const now = new Date().toISOString();
        const synthetic = {
          id: `local-${Date.now()}`,
          timestamp: now,
          changed_by_name: "You",
          field_changed: "remarks",
          old_value: null,
          new_value: remarks,
          description: `Remarks updated.`,
          __synthetic: true,
        };
        syntheticRef.current = [
          synthetic,
          ...(syntheticRef.current || []),
        ].slice(0, 3);
        setLogs((prev) => [synthetic, ...(prev || [])]);
      } catch (err) {
        console.warn("LeadLogDisplay: failed to handle crm:remarkUpdated", err);
      }
    };

    const onLeadUpdated = (e) => {
      try {
        const { id, field_changed, old_value, new_value } = e?.detail || {};
        if (!id || String(id) !== String(leadId)) return;
        const now = new Date().toISOString();
        const synthetic = {
          id: `local-update-${Date.now()}`,
          timestamp: now,
          changed_by_name: "You",
          field_changed: field_changed || "unknown",
          old_value: old_value ?? null,
          new_value: new_value ?? null,
          description: `${field_changed} updated to '${new_value}'.`,
          __synthetic: true,
        };
        syntheticRef.current = [
          synthetic,
          ...(syntheticRef.current || []),
        ].slice(0, 3);
        setLogs((prev) => [synthetic, ...(prev || [])]);
      } catch (err) {
        console.warn("LeadLogDisplay: failed to handle crm:leadUpdated", err);
      }
    };

    window.addEventListener("crm:remarkUpdated", onRemarkUpdated);
    window.addEventListener("crm:leadUpdated", onLeadUpdated);
    return () => {
      window.removeEventListener("crm:remarkUpdated", onRemarkUpdated);
      window.removeEventListener("crm:leadUpdated", onLeadUpdated);
    };
  }, [leadId]);

  const toggleExpansion = useCallback(() => setIsExpanded((p) => !p), []);

  const getLogEntryClasses = (changedByName) => {
    const name = (changedByName || "").toLowerCase();
    switch (name) {
      case "admin":
        return "bg-green-50 text-green-800 border-green-200";
      case "superadmin":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "sales_rep":
        return "bg-purple-50 text-purple-800 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Task 3.3: Format log entry showing Substatus, Followup Date, and Remarks prominently
  const formatLogEntry = (log) => {
    const timestamp = formatTimestamp(log.timestamp);
    let descriptionText = log.description;

    if (!descriptionText && log.field_changed) {
      if (log.field_changed === "remarks") {
        descriptionText = `Remarks updated.`;
      } else if (log.field_changed === "status") {
        descriptionText = `Status changed to '${log.new_value}'.`;
      } else if (
        log.field_changed === "substatus" ||
        log.field_changed === "sub_status"
      ) {
        descriptionText = `Substatus changed from '${log.old_value}' to '${log.new_value}'.`;
      } else if (log.field_changed === "last_call")
        descriptionText = `Last Call changed from '${getFormattedDate(
          log.old_value
        )}' to '${getFormattedDate(log.new_value)}'.`;
      else if (log.field_changed === "next_call")
        descriptionText = `Next Call changed from '${getFormattedDate(
          log.old_value
        )}' to '${getFormattedDate(log.new_value)}'.`;
      else if (log.field_changed === "followup_at")
        descriptionText = `Followup Date set to '${getFormattedDate(log.new_value)}'.`;
      else if (log.field_changed === "age")
        descriptionText = `Age changed from '${log.old_value}' to '${log.new_value}'.`;
      else if (log.field_changed === "grade")
        descriptionText = `Grade changed from '${log.old_value}' to '${log.new_value}'.`;
      else
        descriptionText = `${log.field_changed} changed from '${log.old_value}' to '${log.new_value}'.`;
    } else if (!descriptionText)
      descriptionText = "No specific description available.";

    return `${
      log.changed_by_name || "System"
    } at ${timestamp}: ${descriptionText}`;
  };

  if (loading)
    return <div className="text-gray-500 text-xs">Loading logs...</div>;
  if (error) return <div className="text-red-500 text-xs">Error: {error}</div>;
  if (!logs.length)
    return <div className="text-gray-500 text-xs">No log entries.</div>;

  // Task 3.3: Show only latest log entry by default; older logs collapsed
  const logsToDisplay = isExpanded ? logs : logs.slice(0, 1);
  const hasMoreLogs = logs.length > 1;

  // Task 3.3: For the latest log, check if it has activity metadata
  const latestLog = logs[0];
  const hasActivityMeta =
    latestLog?.sub_status || latestLog?.followup_at || latestLog?.remarks;

  return (
    <div
      className="whitespace-pre-wrap max-h-24 overflow-y-auto text-xs"
      style={{ minWidth: "200px" }}
    >
      {logsToDisplay.map((log, idx) => {
        const entryText = formatLogEntry(log);
        return (
          <div
            key={log.id}
            className={`mb-1 last:mb-0 p-1.5 rounded-sm border ${getLogEntryClasses(
              log.changed_by_name
            )}`}
            title={entryText}
          >
            {/* Task 3.3: Show substatus, followup, remarks for activity logs */}
            {idx === 0 && log.sub_status && (
              <div className="font-semibold text-[10px] mb-0.5 text-slate-600">
                Status: {log.sub_status}
              </div>
            )}
            {idx === 0 && log.followup_at && (
              <div className="text-[10px] text-slate-500 mb-0.5">
                Followup: {getFormattedDate(log.followup_at)}
              </div>
            )}
            {idx === 0 && log.remarks && (
              <div className="text-[10px] text-slate-600 italic mb-0.5 truncate">
                {log.remarks}
              </div>
            )}
            <div>{entryText}</div>
          </div>
        );
      })}
      {/* Task 3.3: Collapse/expand older logs */}
      {hasMoreLogs && (
        <button
          onClick={toggleExpansion}
          className="text-blue-600 hover:text-blue-800 text-xs mt-1 block underline"
        >
          {isExpanded ? "Show Less" : `Show ${logs.length - 1} more log(s)`}
        </button>
      )}
    </div>
  );
};

export default LeadLogDisplay;
