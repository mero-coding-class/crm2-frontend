import React, { useMemo, useState } from "react";
import { Download, Trash2, FileText, AlertTriangle, X } from "lucide-react";
import { exportsStore } from "../services/exportsStore";
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

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function downloadItem(item) {
  try {
    const blob = new Blob([item.content], { type: item.mimeType || "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.fileName || "download.txt";
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Failed to download item:", e);
  }
}

const Downloads = () => {
  const [itemsVersion, setItemsVersion] = useState(0);
  const items = useMemo(() => exportsStore.list(), [itemsVersion]);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDelete = (id) => {
    exportsStore.remove(id);
    setItemsVersion((v) => v + 1);
    setDeleteConfirmId(null);
  };

  const handleClear = () => {
    exportsStore.clear();
    setItemsVersion((v) => v + 1);
    setClearConfirmOpen(false);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-full">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-[20px] font-[600] leading-[28px] tracking-[-0.015em] text-slate-900">Downloads</h1>
        <p className="text-[13px] text-slate-500 leading-[18px] mt-0.5">Saved exports from leads and enrollment data</p>
      </div>

      <div className="p-6">
        {items.length === 0 ? (
          <div className="bg-white rounded-[12px] border border-slate-200 py-16 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-[15px] font-[500] text-slate-700 mb-1">No saved exports</p>
            <p className="text-[13px] text-slate-400">Export leads or enrollments to see them here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-[14px] font-[600] text-slate-900">Saved Exports</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">{items.length} file{items.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => setClearConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-[500] text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em]">File</th>
                    <th className="px-5 py-3 text-left text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em]">Source</th>
                    <th className="px-5 py-3 text-left text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em]">Exported By</th>
                    <th className="px-5 py-3 text-left text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em]">Created</th>
                    <th className="px-5 py-3 text-right text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-[8px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-[500] text-slate-800 truncate max-w-[220px]">
                              {item.fileName || "download.csv"}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {item.mimeType} · {formatBytes(item.size)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{item.source || "Unknown"}</td>
                      <td className="px-5 py-3.5 text-slate-500">{item.exportedBy || "—"}</td>
                      <td className="px-5 py-3.5 text-slate-400 tabular-nums">{formatDate(item.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => downloadItem(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#294998] hover:bg-[#1E3776] text-white text-[12px] font-[500] rounded-[8px] transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-[6px] hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Single Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Delete Export?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This export file will be permanently removed from saved downloads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteConfirmId)}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Clear All Exports?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All {items.length} saved export file{items.length !== 1 ? "s" : ""} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Downloads;
