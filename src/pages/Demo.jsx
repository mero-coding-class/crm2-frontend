import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MonitorPlay,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  Building2,
  MapPin,
  User,
  Phone,
  GraduationCap,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  AlertTriangle,
} from "lucide-react";
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

const INITIAL_DEMOS = [
  {
    id: 1,
    schoolName: "Budhanilkantha School",
    district: "Kathmandu",
    municipality: "Budhanilkantha Municipality",
    contactPerson: "Ramesh Sharma",
    contactNumber: "9841234567",
    demoStatus: "Scheduled",
    demoDetails: "Intro to Python & AI curriculum for Grade 8-10 students",
    teacherAssigned: "Aayush Thapa",
    remarks: "Projector and computer lab will be arranged by coordinator",
    createdAt: "2026-10-05",
  },
  {
    id: 2,
    schoolName: "Little Angels' School",
    district: "Lalitpur",
    municipality: "Lalitpur Metropolitan City",
    contactPerson: "Sunita Shrestha",
    contactNumber: "9801234567",
    demoStatus: "Upcoming",
    demoDetails: "Robotics and STEM hands-on lab demonstration",
    teacherAssigned: "Pooja Gurung",
    remarks: "Principal requested 45-minute interactive presentation",
    createdAt: "2026-10-06",
  },
  {
    id: 3,
    schoolName: "Gandaki Boarding School",
    district: "Kaski",
    municipality: "Pokhara Metropolitan City",
    contactPerson: "Kishor Baral",
    contactNumber: "9856012345",
    demoStatus: "Completed",
    demoDetails: "Web Development track & MeroCoding platform walkthrough",
    teacherAssigned: "Bikash Adhikari",
    remarks: "Received enthusiastic feedback; follow-up proposal sent",
    createdAt: "2026-10-02",
  },
];

const DEMO_STATUS_CONFIG = {
  Scheduled: {
    label: "Scheduled",
    badge: "bg-blue-50 text-blue-700 border-blue-200/70",
    dot: "bg-blue-500",
  },
  Upcoming: {
    label: "Upcoming",
    badge: "bg-amber-50 text-amber-700 border-amber-200/70",
    dot: "bg-amber-500",
  },
  Completed: {
    label: "Completed",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    dot: "bg-emerald-500",
  },
};

const Demo = () => {
  // --- Persistent Storage State ---
  const [demos, setDemos] = useState(() => {
    try {
      const saved = localStorage.getItem("crm_demos");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load demos from localStorage:", e);
    }
    return INITIAL_DEMOS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("crm_demos", JSON.stringify(demos));
    } catch (e) {
      console.error("Failed to save demos to localStorage:", e);
    }
  }, [demos]);

  // --- Filtering & Search State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const tableContainerRef = useRef(null);

  const smoothScroll = (distance) => {
    if (!tableContainerRef.current) return;
    tableContainerRef.current.scrollBy({ left: distance, behavior: "smooth" });
  };

  // --- Modal States ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDemo, setEditingDemo] = useState(null);
  const [viewingDemo, setViewingDemo] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // --- Form State ---
  const emptyForm = {
    schoolName: "",
    district: "",
    municipality: "",
    contactPerson: "",
    contactNumber: "",
    demoStatus: "Scheduled",
    demoDetails: "",
    teacherAssigned: "",
    remarks: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (demo) => {
    setEditingDemo(demo);
    setFormData({
      schoolName: demo.schoolName || "",
      district: demo.district || "",
      municipality: demo.municipality || "",
      contactPerson: demo.contactPerson || "",
      contactNumber: demo.contactNumber || "",
      demoStatus: demo.demoStatus || "Scheduled",
      demoDetails: demo.demoDetails || "",
      teacherAssigned: demo.teacherAssigned || "",
      remarks: demo.remarks || "",
    });
  };

  const handleSaveDemo = (e) => {
    e.preventDefault();

    if (!formData.schoolName.trim()) {
      alert("Please enter the school name.");
      return;
    }

    if (editingDemo) {
      setDemos((prev) =>
        prev.map((item) =>
          item.id === editingDemo.id
            ? { ...item, ...formData, updatedAt: new Date().toISOString().split("T")[0] }
            : item
        )
      );
      setEditingDemo(null);
    } else {
      const newEntry = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setDemos((prev) => [newEntry, ...prev]);
      setIsCreateModalOpen(false);
    }
    setFormData(emptyForm);
  };

  const handleDeleteDemo = (id) => {
    setDemos((prev) => prev.filter((item) => item.id !== id));
    if (viewingDemo && viewingDemo.id === id) setViewingDemo(null);
    setDeleteConfirmId(null);
  };

  const stats = useMemo(() => {
    const total = demos.length;
    const scheduled = demos.filter((d) => d.demoStatus === "Scheduled").length;
    const upcoming = demos.filter((d) => d.demoStatus === "Upcoming").length;
    const completed = demos.filter((d) => d.demoStatus === "Completed").length;
    return { total, scheduled, upcoming, completed };
  }, [demos]);

  const filteredDemos = useMemo(() => {
    return demos.filter((item) => {
      const matchesStatus =
        statusFilter === "All" || item.demoStatus === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.schoolName && item.schoolName.toLowerCase().includes(q)) ||
        (item.district && item.district.toLowerCase().includes(q)) ||
        (item.municipality && item.municipality.toLowerCase().includes(q)) ||
        (item.contactPerson && item.contactPerson.toLowerCase().includes(q)) ||
        (item.teacherAssigned && item.teacherAssigned.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [demos, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredDemos.length / pageSize));
  const paginatedDemos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDemos.slice(start, start + pageSize);
  }, [filteredDemos, currentPage, pageSize]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-[Inter,system-ui,sans-serif] antialiased">
      {/* ─── Header: Identical to LeadsHeader ─── */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-[700] text-slate-900 tracking-[-0.015em]">
                School Demos
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-[#EEF2F6] text-slate-600">
                {stats.total} Total
              </span>
            </div>
            <p className="text-[13px] text-slate-500 mt-1">
              Track, schedule, and manage institutional coding demonstrations and lab visits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const saved = localStorage.getItem("crm_demos");
                if (saved) setDemos(JSON.parse(saved));
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#294998] hover:bg-[#1E3776] text-white shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Schedule Demo
            </button>
          </div>
        </div>
      </div>

      {/* ─── Metric Strip ─── */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center justify-between p-3 rounded-[10px] bg-slate-50 border border-slate-200/70">
            <div>
              <p className="text-[11px] font-[600] text-slate-400 uppercase tracking-[0.04em]">
                Total Demos
              </p>
              <p className="text-[18px] font-[700] text-slate-900 mt-0.5">{stats.total}</p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-white border border-slate-200/80 flex items-center justify-center text-slate-600">
              <MonitorPlay className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#EDF2FC]/60 border border-[#CDDBF6]">
            <div>
              <p className="text-[11px] font-[600] text-[#294998] uppercase tracking-[0.04em]">
                Scheduled
              </p>
              <p className="text-[18px] font-[700] text-slate-900 mt-0.5">{stats.scheduled}</p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-white border border-[#CDDBF6] flex items-center justify-center text-[#294998]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#FEF7EB]/70 border border-[#FAD99A]">
            <div>
              <p className="text-[11px] font-[600] text-[#B8740C] uppercase tracking-[0.04em]">
                Upcoming
              </p>
              <p className="text-[18px] font-[700] text-slate-900 mt-0.5">{stats.upcoming}</p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-white border border-[#FAD99A] flex items-center justify-center text-[#E8A026]">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[10px] bg-emerald-50/50 border border-emerald-200/70">
            <div>
              <p className="text-[11px] font-[600] text-emerald-600 uppercase tracking-[0.04em]">
                Completed
              </p>
              <p className="text-[18px] font-[700] text-slate-900 mt-0.5">{stats.completed}</p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-white border border-emerald-200/80 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filters & Search: Identical to LeadsFilters ─── */}
      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[220px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search school, district, person…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-9 pr-3 text-[13px] rounded-[9999px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15 hover:border-slate-300 transition-colors"
            />
          </div>

          <span className="text-[11px] font-[600] text-slate-400 uppercase tracking-[0.04em] mr-1">
            Status:
          </span>

          {/* Filter Pills */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-3 pr-7 text-[13px] font-[500] rounded-[9999px] border border-slate-200 bg-white text-slate-700 appearance-none cursor-pointer transition-colors hover:border-slate-300 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15"
              style={{ minWidth: "120px" }}
            >
              {["All", "Scheduled", "Upcoming", "Completed"].map((st) => (
                <option key={st} value={st}>
                  {st === "All" ? "All Statuses" : st}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="text-[12px] font-[500] text-[#294998] hover:text-[#1E3776] ml-2"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* ─── Table Display: Identical to Archive ─── */}
      <div className="flex-1 overflow-x-auto bg-white custom-scrollbar">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                School & Location
              </th>
              <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                Contact Person
              </th>
              <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                Contact Number
              </th>
              <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                Demo Details
              </th>
              <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                Teacher Assigned
              </th>
              <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                Status
              </th>
              <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                Remarks
              </th>
              <th className="px-4 h-9 text-right text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap pr-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {paginatedDemos.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400">
                  <MonitorPlay className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-[14px] font-[600] text-slate-900 mb-1">
                    No active demo sessions found
                  </p>
                  <p className="text-[13px] text-slate-500">
                    Try adjusting your filters or click "Schedule Demo" to add a new record.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedDemos.map((demo) => {
                const statusCfg =
                  DEMO_STATUS_CONFIG[demo.demoStatus] || DEMO_STATUS_CONFIG.Scheduled;

                return (
                  <tr
                    key={demo.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* School & Location */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[6px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[13px] font-[600] text-slate-900 block leading-snug whitespace-nowrap">
                            {demo.schoolName}
                          </span>
                          <span className="text-[12px] text-slate-500 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                            <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                            {demo.municipality ? `${demo.municipality}, ` : ""}
                            {demo.district}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="px-4 py-3 whitespace-nowrap text-[13px] font-[500] text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {demo.contactPerson || "—"}
                      </div>
                    </td>

                    {/* Contact Number */}
                    <td className="px-4 py-3 whitespace-nowrap text-[13px] text-slate-600">
                      {demo.contactNumber ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {demo.contactNumber}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Demo Details */}
                    <td className="px-4 py-3 whitespace-nowrap max-w-sm">
                      <span
                        className="text-[13px] text-slate-600 block truncate"
                        title={demo.demoDetails}
                      >
                        {demo.demoDetails || "—"}
                      </span>
                    </td>

                    {/* Teacher Assigned */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-[500] text-slate-700 bg-[#EEF2F6] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        <GraduationCap className="w-3.5 h-3.5 text-[#294998] shrink-0" />
                        {demo.teacherAssigned || "Unassigned"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-[500] border whitespace-nowrap ${statusCfg.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {demo.demoStatus}
                      </span>
                    </td>

                    {/* Remarks */}
                    <td className="px-4 py-3 whitespace-nowrap max-w-xs">
                      <span
                        className="text-[12px] text-slate-500 italic block truncate"
                        title={demo.remarks}
                      >
                        {demo.remarks || "—"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingDemo(demo)}
                          className="p-1 text-slate-400 hover:text-slate-700 transition"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(demo)}
                          className="p-1 text-slate-400 hover:text-[#294998] transition"
                          title="Edit Demo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(demo.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Delete Demo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Pagination Footer: Identical to Archive ─── */}
      <div className="px-6 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-slate-500">
        <div className="whitespace-nowrap">
          Showing {paginatedDemos.length} of {filteredDemos.length} demo records
        </div>

        <div className="flex items-center gap-2 whitespace-nowrap">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <span className="px-3 py-1 rounded-[6px] bg-slate-50 text-slate-700 text-[12px] font-[600] whitespace-nowrap">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── MODAL: Identical to AddLeadModal Design ─── */}
      {(isCreateModalOpen || editingDemo) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[16px] shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[6px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center">
                  <MonitorPlay className="w-4 h-4" />
                </div>
                <h3 className="text-[17px] font-[700] text-slate-900 tracking-[-0.01em]">
                  {editingDemo ? "Edit Demo Session" : "Schedule New Demo"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingDemo(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveDemo} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* School Name */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    SCHOOL NAME <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleInputChange}
                    placeholder="e.g. Budhanilkantha Secondary School"
                    required
                    className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  />
                </div>

                {/* District */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    DISTRICT <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    placeholder="e.g. Kathmandu"
                    required
                    className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  />
                </div>

                {/* Municipality */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    MUNICIPALITY <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="municipality"
                    value={formData.municipality}
                    onChange={handleInputChange}
                    placeholder="e.g. Budhanilkantha Municipality"
                    required
                    className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  />
                </div>

                {/* Contact Person */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    CONTACT PERSON
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    CONTACT NUMBER
                  </label>
                  <input
                    type="text"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. 98XXXXXXXX"
                    className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  />
                </div>

                {/* Demo Status */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    DEMO STATUS <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="demoStatus"
                      value={formData.demoStatus}
                      onChange={handleInputChange}
                      className="w-full h-10 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Completed">Completed</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Teacher Assigned */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    TEACHER ASSIGNED
                  </label>
                  <input
                    type="text"
                    name="teacherAssigned"
                    value={formData.teacherAssigned}
                    onChange={handleInputChange}
                    placeholder="e.g. Aayush Thapa"
                    className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  />
                </div>

                {/* Demo Details */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    DEMO DETAILS
                  </label>
                  <input
                    type="text"
                    name="demoDetails"
                    value={formData.demoDetails}
                    onChange={handleInputChange}
                    placeholder="e.g. Grade 9 Python & Robotics live demonstration"
                    className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  />
                </div>

                {/* Remarks */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    REMARKS
                  </label>
                  <input
                    type="text"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="e.g. Lab confirmed, coordinator will assist"
                    className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingDemo(null);
                  }}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#294998] hover:bg-[#1E3776] text-white shadow-sm transition-colors"
                >
                  {editingDemo ? "Save Changes" : "Save Demo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW DETAILS ─── */}
      {viewingDemo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-[17px] font-[700] text-slate-900 tracking-[-0.01em]">
                Demo Session Details
              </h3>
              <button
                onClick={() => setViewingDemo(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[11px] font-[700] text-slate-500 uppercase tracking-wider">School Name</p>
                <p className="text-[15px] font-[700] text-slate-900 mt-0.5">
                  {viewingDemo.schoolName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-[700] text-slate-500 uppercase tracking-wider">District</p>
                  <p className="text-[13px] font-[500] text-slate-800 mt-0.5">
                    {viewingDemo.district}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-[700] text-slate-500 uppercase tracking-wider">Municipality</p>
                  <p className="text-[13px] font-[500] text-slate-800 mt-0.5">
                    {viewingDemo.municipality}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-[700] text-slate-500 uppercase tracking-wider">Contact Person</p>
                  <p className="text-[13px] font-[500] text-slate-800 mt-0.5">
                    {viewingDemo.contactPerson || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-[700] text-slate-500 uppercase tracking-wider">Contact Number</p>
                  <p className="text-[13px] font-[500] text-slate-800 mt-0.5">
                    {viewingDemo.contactNumber || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-[700] text-slate-500 uppercase tracking-wider">Status</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-[500] mt-1 border ${(DEMO_STATUS_CONFIG[viewingDemo.demoStatus] || DEMO_STATUS_CONFIG.Scheduled)
                        .badge
                      }`}
                  >
                    {viewingDemo.demoStatus}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-[700] text-slate-500 uppercase tracking-wider">Teacher Assigned</p>
                  <p className="text-[13px] font-[500] text-slate-800 mt-0.5">
                    {viewingDemo.teacherAssigned || "Unassigned"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-[700] text-slate-500 uppercase tracking-wider">Demo Details</p>
                <p className="text-[13px] text-slate-700 bg-slate-50 p-3 rounded-[10px] border border-slate-200/80 mt-1">
                  {viewingDemo.demoDetails || "No details provided"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-[700] text-slate-500 uppercase tracking-wider">Remarks</p>
                <p className="text-[13px] text-slate-700 bg-slate-50 p-3 rounded-[10px] border border-slate-200/80 mt-1">
                  {viewingDemo.remarks || "No remarks provided"}
                </p>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50/60 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingDemo(null)}
                className="px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Demo Confirmation ─── */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Delete Demo Record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This demo record will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteDemo(deleteConfirmId)}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              Delete Demo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Demo;
