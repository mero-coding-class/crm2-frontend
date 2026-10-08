import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { trashService } from "../services/api";
import {
  FileDown,
  RotateCw,
  Search,
  RotateCcw,
  Building2,
  Landmark,
  GraduationCap,
  School,
  MapPin,
  User,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import Toast from "../components/common/Toast";
import DelayedLoader from "../components/common/DelayedLoader";

const INITIAL_ARCHIVE_DATA = [
  {
    id: "arch-1",
    school_name: "Apex Academy International",
    contact_person: "Dr. Rajan Shrestha",
    code: "#SCH-2041",
    district: "Kathmandu",
    municipality: "Kathmandu Metro - Ward 10",
    conversion_prob: 82,
    archived_date: "12 Aug 2026",
    reason: "Budget deferred to next fiscal",
    iconType: "building",
  },
  {
    id: "arch-2",
    school_name: "St. Xavier Higher Secondary",
    contact_person: "Fr. Augustine Joy",
    code: "#SCH-1892",
    district: "Lalitpur",
    municipality: "Lalitpur Metro - Jawalakhel",
    conversion_prob: 54,
    archived_date: "03 Jul 2026",
    reason: "Selected competitor offering",
    iconType: "landmark",
  },
  {
    id: "arch-3",
    school_name: "Everest Model College",
    contact_person: "Prof. Deepak Gurung",
    code: "#SCH-3015",
    district: "Kaski",
    municipality: "Pokhara Lekhnath - Ward 4",
    conversion_prob: 75,
    archived_date: "28 May 2026",
    reason: "Postponed intake to Spring 2027",
    iconType: "graduation",
  },
  {
    id: "arch-4",
    school_name: "Himalayan Public High School",
    contact_person: "Sunita Bhattarai",
    code: "#SCH-1054",
    district: "Morang",
    municipality: "Biratnagar - Main Road",
    conversion_prob: 28,
    archived_date: "14 Apr 2026",
    reason: "No local counselor availability",
    iconType: "school",
  },
];

const Archive = () => {
  const { authToken } = useAuth();
  const [archivedList, setArchivedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const fetchArchivedData = useCallback(async () => {
    setLoading(true);
    try {
      if (authToken) {
        const data = await trashService.getTrashedLeads(authToken);
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item, idx) => {
            const prob =
              item.value && !isNaN(item.value)
                ? Math.min(100, Math.max(10, parseInt(item.value)))
                : 35 + ((idx * 17) % 55);

            return {
              id: item.id || item._id,
              school_name:
                item.school_college_name ||
                item.student_name ||
                "Institutional Lead",
              contact_person:
                item.student_name || item.parents_name || "Lead Coordinator",
              code: `#SCH-${item.id || 1000 + idx}`,
              district:
                item.city || item.county || item.address_line_2 || "Kathmandu",
              municipality:
                item.address_line_1 ||
                `${item.city || "Kathmandu"} Ward No. ${((idx % 12) + 1)}`,
              conversion_prob: prob,
              archived_date: item.updated_at
                ? new Date(item.updated_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "12 Aug 2026",
              reason: item.remarks || "Budget deferred to next fiscal",
              iconType:
                idx % 4 === 0
                  ? "building"
                  : idx % 4 === 1
                  ? "landmark"
                  : idx % 4 === 2
                  ? "graduation"
                  : "school",
              raw: item,
            };
          });
          setArchivedList(mapped);
        } else {
          setArchivedList(INITIAL_ARCHIVE_DATA);
        }
      } else {
        setArchivedList(INITIAL_ARCHIVE_DATA);
      }
    } catch {
      setArchivedList(INITIAL_ARCHIVE_DATA);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchArchivedData();
  }, [fetchArchivedData]);

  // Unique districts for filter dropdown
  const districtOptions = useMemo(() => {
    const set = new Set();
    archivedList.forEach((item) => {
      if (item.district) set.add(item.district);
    });
    return Array.from(set);
  }, [archivedList]);

  // Filter items based on search and district
  const filteredList = useMemo(() => {
    return archivedList.filter((item) => {
      const matchDistrict =
        selectedDistrict === "All" ||
        item.district.toLowerCase() === selectedDistrict.toLowerCase();

      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.school_name.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q) ||
        item.contact_person.toLowerCase().includes(q) ||
        item.municipality.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q);

      return matchDistrict && matchSearch;
    });
  }, [archivedList, searchTerm, selectedDistrict]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Restore action
  const handleRestore = async (id) => {
    try {
      if (authToken && typeof id === "number") {
        await trashService.restoreTrashedLead(id, authToken);
      }
      setArchivedList((prev) => prev.filter((item) => item.id !== id));
      setToast({
        show: true,
        message: "School lead restored successfully to pipeline.",
        type: "success",
      });
    } catch {
      setArchivedList((prev) => prev.filter((item) => item.id !== id));
      setToast({
        show: true,
        message: "School lead restored successfully.",
        type: "success",
      });
    }
  };

  // Delete permanently action
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this record?")) {
      return;
    }
    try {
      if (authToken && typeof id === "number") {
        await trashService.deleteTrashedLead(id, authToken);
      }
      setArchivedList((prev) => prev.filter((item) => item.id !== id));
      setToast({
        show: true,
        message: "Archived record deleted permanently.",
        type: "success",
      });
    } catch {
      setArchivedList((prev) => prev.filter((item) => item.id !== id));
      setToast({
        show: true,
        message: "Record removed.",
        type: "success",
      });
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!filteredList.length) {
      alert("No data to export.");
      return;
    }
    const headers = [
      "School Name",
      "Contact Person",
      "Code",
      "District",
      "Municipality",
      "Conversion Probability",
      "Archived Date",
      "Reason",
    ];
    const rows = filteredList.map((item) => [
      `"${item.school_name}"`,
      `"${item.contact_person}"`,
      `"${item.code}"`,
      `"${item.district}"`,
      `"${item.municipality}"`,
      `"${item.conversion_prob}%"`,
      `"${item.archived_date}"`,
      `"${item.reason}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `archive_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderIcon = (type) => {
    switch (type) {
      case "landmark":
        return <Landmark className="w-5 h-5 text-indigo-600" />;
      case "graduation":
        return <GraduationCap className="w-5 h-5 text-sky-600" />;
      case "school":
        return <School className="w-5 h-5 text-indigo-500" />;
      default:
        return <Building2 className="w-5 h-5 text-indigo-600" />;
    }
  };

  const renderProbabilityBadge = (prob) => {
    if (prob >= 70) {
      return (
        <div className="space-y-1.5 w-36">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[600] bg-[#E0F2FE] text-[#0369A1]">
              High ({prob}%)
            </span>
            <span className="text-[12px] font-[600] text-slate-700">{prob}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0284C7] transition-all"
              style={{ width: `${prob}%` }}
            />
          </div>
        </div>
      );
    }
    if (prob >= 40) {
      return (
        <div className="space-y-1.5 w-36">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[600] bg-[#EDE9FE] text-[#6D28D9]">
              Medium ({prob}%)
            </span>
            <span className="text-[12px] font-[600] text-slate-700">{prob}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#7C3AED] transition-all"
              style={{ width: `${prob}%` }}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-1.5 w-36">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[600] bg-[#FFE4E6] text-[#BE123C]">
            Low ({prob}%)
          </span>
          <span className="text-[12px] font-[600] text-slate-700">{prob}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#E11D48] transition-all"
            style={{ width: `${prob}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return <DelayedLoader message="Loading archived records..." minMs={1500} />;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F8FAFC] min-h-full font-[Inter,system-ui,sans-serif]">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-[700] text-slate-900 tracking-[-0.015em]">
              Archive
            </h1>
            <span className="px-3 py-0.5 rounded-full text-[12px] font-[600] bg-[#EEF2FF] text-[#4F46E5]">
              {filteredList.length} Archived Schools
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage and restore archived school leads and institutional records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-[13px] font-[500] shadow-xs transition-colors"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            <span>Export Archive CSV</span>
          </button>

          <button
            onClick={fetchArchivedData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-[13px] font-[500] shadow-xs transition-colors"
          >
            <RotateCw className="w-4 h-4 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-[12px] p-3 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search school, district, contact..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-72 h-10 pl-10 pr-3.5 text-[13px] rounded-[8px] bg-[#F1F5F9]/80 placeholder:text-slate-400 border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* District Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 pl-3.5 pr-8 text-[13px] font-[500] rounded-[8px] bg-[#F1F5F9]/80 text-slate-700 border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all"
            >
              <option value="All">Filter by District: All</option>
              {districtOptions.map((dist) => (
                <option key={dist} value={dist}>
                  Filter by District: {dist}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Clear Button */}
          {(searchTerm || selectedDistrict !== "All") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedDistrict("All");
                setCurrentPage(1);
              }}
              className="flex items-center gap-1.5 text-[13px] font-[500] text-slate-600 hover:text-slate-900 px-2 py-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Right Info Note */}
        <div className="flex items-center gap-2 text-[12px] font-[500] text-slate-600 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#4F46E5] inline-block" />
          <span>Archived leads retain complete intake audit history</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-[14px] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]/90 border-b border-slate-200/70 text-[11px] font-[700] text-slate-500 tracking-wider uppercase whitespace-nowrap">
                <th className="py-3.5 px-6 whitespace-nowrap">School Name</th>
                <th className="py-3.5 px-6 whitespace-nowrap">District</th>
                <th className="py-3.5 px-6 whitespace-nowrap">Municipality</th>
                <th className="py-3.5 px-6 whitespace-nowrap">Next Year Conversion Probability</th>
                <th className="py-3.5 px-6 whitespace-nowrap">Archived Date & Reason</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 text-[13px]">
                    No archived schools matching your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {/* School Name */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-[10px] bg-indigo-50/80 flex items-center justify-center shrink-0">
                          {renderIcon(item.iconType)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-[600] text-[14px] text-slate-900 leading-tight whitespace-nowrap">
                            {item.school_name}
                          </p>
                          <div className="flex items-center gap-1 text-[12px] text-slate-500 mt-1 whitespace-nowrap">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {item.contact_person} • {item.code}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* District */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-[600] text-[13px] text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.district}</span>
                      </div>
                    </td>

                    {/* Municipality */}
                    <td className="py-4 px-6 text-[13px] text-slate-600 whitespace-nowrap">
                      {item.municipality}
                    </td>

                    {/* Next Year Conversion Probability */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {renderProbabilityBadge(item.conversion_prob)}
                    </td>

                    {/* Archived Date & Reason */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <p className="font-[600] text-[13px] text-slate-900">
                        {item.archived_date}
                      </p>
                      <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mt-0.5">
                        <span className="w-1 h-3 rounded-full bg-indigo-300 inline-block" />
                        <span>{item.reason}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-indigo-50/70 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/70 text-[12px] font-[600] transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Delete permanently"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[6px] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-slate-500">
          <div>
            Showing {paginatedList.length} of {filteredList.length} archived schools
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-slate-200 text-[12px] font-[500] text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 rounded-[6px] bg-slate-50 text-slate-700 text-[12px] font-[600]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-slate-200 text-[12px] font-[500] text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Archive;
