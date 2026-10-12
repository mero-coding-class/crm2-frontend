import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const SUB_STATUS_BADGES = {
  new:          { label: "New",        classes: "bg-[#EDF2FC] text-[#294998] ring-1 ring-[#CDDBF6]" },
  interested:   { label: "Interested", classes: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
  followup:     { label: "Follow-up",  classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  demo:         { label: "Demo",       classes: "bg-violet-50 text-violet-700 ring-1 ring-violet-200" },
  converted:    { label: "Converted",  classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  enrolled:     { label: "Enrolled",   classes: "bg-teal-50 text-teal-700 ring-1 ring-teal-200" },
  lost:         { label: "Lost",       classes: "bg-rose-50 text-rose-600 ring-1 ring-rose-200" },
  junk:         { label: "Junk",       classes: "bg-slate-100 text-slate-500 ring-1 ring-slate-200" },
};

const getStatusBadge = (status = "") => {
  const key = status.toLowerCase().replace(/\s+/g, "");
  return SUB_STATUS_BADGES[key] || { label: status || "—", classes: "bg-slate-100 text-slate-500 ring-1 ring-slate-200" };
};

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const resolveRegisteredOn = (lead) => {
  if (!lead) return null;
  return (
    lead.registeredOn || lead.registered_on ||
    lead.addDate || lead.add_date ||
    lead.createdAt || lead.created_at ||
    lead.createdOn || lead.created_on || null
  );
};

const LatestLeadsTable = ({ leads = [] }) => {
  return (
    <div className="bg-white rounded-[12px] border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-[14px] font-[600] text-slate-900 leading-[20px] tracking-[-0.005em]">
            Latest Lead Registrations
          </h3>
          <p className="text-[12px] text-slate-400 mt-0.5">Most recently added leads</p>
        </div>
        <Link
          to="/leads"
          className="flex items-center gap-1.5 text-[12px] font-[500] text-[#294998] hover:text-[#1E3776] transition-colors"
        >
          View all
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="py-12 text-center text-[13px] text-slate-400">
          No recent leads to display.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em]">School / Name</th>
                <th className="px-5 py-3 text-left text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em]">Contact</th>
                <th className="px-5 py-3 text-left text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em]">District</th>
                <th className="px-5 py-3 text-left text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em]">Status</th>
                <th className="px-5 py-3 text-left text-[11px] font-[600] text-slate-400 uppercase tracking-[0.05em]">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leads.map((lead, idx) => {
                const badge = getStatusBadge(lead.sub_status || lead.status || "");
                const name = lead.school_name || lead.studentName || lead.name || "—";
                const contact = lead.contact_number || lead.phone || lead.email || "—";
                const district = lead.district || lead.city || "—";

                return (
                  <tr key={lead.id || lead._id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-[500] text-slate-800 truncate max-w-[180px] block">
                        {name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 tabular-nums">
                      {contact}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {district}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-[600] ${badge.classes}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 tabular-nums">
                      {formatDate(resolveRegisteredOn(lead))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LatestLeadsTable;
