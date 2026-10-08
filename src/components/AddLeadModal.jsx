import React, { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import useAddLeadForm from "./addLead/useAddLeadForm";
import useUsers from "../pages/leads/useUsers";
import {
  UserPlus,
  X,
  Building2,
  GraduationCap,
  Contact,
  User,
  Phone,
  Mail,
  Link2,
  Headphones,
  TrendingUp,
  Calendar,
  Clock,
  MonitorPlay,
  History,
  ShieldCheck,
  Check,
  ChevronDown,
} from "lucide-react";

const NEPAL_DISTRICTS = [
  "Kathmandu",
  "Lalitpur",
  "Bhaktapur",
  "Kaski (Pokhara)",
  "Chitwan",
  "Rupandehi (Butwal)",
  "Morang (Biratnagar)",
  "Jhapa",
  "Sunsari (Dharan)",
  "Banke (Nepalgunj)",
  "Kailali (Dhangadhi)",
  "Dhanusha (Janakpur)",
  "Parsa (Birgunj)",
  "Makwanpur (Hetauda)",
  "Kavrepalanchok",
  "Gorkha",
  "Tanahun",
  "Nawalparasi",
  "Dang",
  "Surkhet",
  "Sindhupalchok",
  "Nuwakot",
  "Dhading",
  "Palpa",
  "Lamjung",
  "Syangja",
  "Ilam",
  "Kanchanpur",
  "Bardiya",
];

const PROPOSAL_STATUS_OPTIONS = [
  "Draft",
  "Sent",
  "Under Review",
  "Negotiating",
  "Accepted",
  "Declined",
];

const STATUS_OPTIONS = ["New", "In Progress", "Contacted", "Converted", "Lost"];

const SUB_STATUS_OPTIONS = [
  "Follow-up Needed",
  "New",
  "Open",
  "Followup",
  "inProgress",
  "Interested",
  "Average",
  "Junk",
  "NextBatch",
];

const ACTIVITY_OPTIONS = [
  "Phone Call",
  "Email",
  "Meeting",
  "Campus Visit",
  "Demo",
  "Institutional Visit",
  "WhatsApp/Viber",
  "Facebook",
  "Website",
  "Office Visit",
  "Direct call",
  "TikTok",
  "Instagram",
  "Other",
];

const AddLeadModal = ({ onClose, onSave, courses = [], authToken }) => {
  const { user } = useAuth();
  const isAdmin =
    user &&
    (user.role === "admin" ||
      user.role === "super admin" ||
      user.role === "superadmin" ||
      user.role === "super-admin");

  const { formData, setField, errors, handleSubmit } = useAddLeadForm({
    courses,
    authToken,
    onClose,
    onSave,
    isAdmin,
  });

  const modalContentRef = useRef(null);
  const { users, usersLoading } = useUsers(authToken);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleOverlayClick = (event) => {
    if (
      modalContentRef.current &&
      !modalContentRef.current.contains(event.target)
    ) {
      if (!errors || Object.keys(errors).length === 0) onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setField(name, type === "checkbox" ? checked : value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await handleSubmit();
  };

  const currentUsername =
    user?.username || localStorage.getItem("username") || "Admin User";
  const currentUserRole = user?.role || localStorage.getItem("role") || "Superadmin";
  const todayIso = new Date().toISOString().split("T")[0];

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-[3px] flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalContentRef}
        className="bg-white rounded-[16px] shadow-2xl border border-slate-200/80 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[14px] bg-[#3B49DF] flex items-center justify-center text-white shadow-sm shrink-0">
              <UserPlus className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[19px] font-[700] text-slate-900 leading-tight">
                  Add New Lead
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[600] bg-[#EEF2FF] text-[#4F46E5]">
                  Admissions OS
                </span>
              </div>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Enter school details, contact profile, counselor assignments, and pipeline timeline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 text-slate-800">
            {/* 1. School / Institution Info */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[#3B49DF]">
                <Building2 className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                  1. School / Institution Info
                </h3>
              </div>

              {/* School Name */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-[700]">
                  <label htmlFor="school_college_name" className="text-slate-700 uppercase tracking-wider">
                    SCHOOL NAME <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-slate-400 font-normal lowercase">full registered title</span>
                </div>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="school_college_name"
                    name="school_college_name"
                    type="text"
                    required
                    value={formData.school_college_name}
                    onChange={handleChange}
                    placeholder="Enter school / institution name"
                    className="w-full h-11 pl-10 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                {errors?.school_college_name && (
                  <p className="text-[11px] text-rose-500">{errors.school_college_name}</p>
                )}
              </div>

              {/* District & Municipality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="district" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    DISTRICT <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="district"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      className="w-full h-11 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      <option value="">Select District</option>
                      {NEPAL_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="municipality" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    MUNICIPALITY / LOCAL BODY <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="municipality"
                    name="municipality"
                    type="text"
                    value={formData.municipality}
                    onChange={handleChange}
                    placeholder="e.g. Kathmandu Metropolitan City / Ward No."
                    className="w-full h-11 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* 2. Primary Contact Details */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[#3B49DF]">
                <Contact className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                  2. Primary Contact Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="contact_person" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    CONTACT PERSON <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="contact_person"
                      name="contact_person"
                      type="text"
                      required
                      value={formData.contact_person}
                      onChange={handleChange}
                      placeholder="Full name (e.g. Principal / Lead Coordinator)"
                      className="w-full h-11 pl-10 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {errors?.contact_person && (
                    <p className="text-[11px] text-rose-500">{errors.contact_person}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact_number" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    CONTACT NUMBER <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="contact_number"
                      name="contact_number"
                      type="text"
                      required
                      value={formData.contact_number}
                      onChange={handleChange}
                      placeholder="+977 98XXXXXXXX"
                      className="w-full h-11 pl-10 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {errors?.contact_number && (
                    <p className="text-[11px] text-rose-500">{errors.contact_number}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    EMAIL ADDRESS <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="official@school.edu.np"
                      className="w-full h-11 pl-10 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="website" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    SOCIAL MEDIA / WEBSITE
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="website"
                      name="website"
                      type="text"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="LinkedIn, Facebook, or Website URL"
                      className="w-full h-11 pl-10 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Lead & Counselor Assignment */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[#3B49DF]">
                <Headphones className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                  3. Lead & Counselor Assignment
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="assigned_to" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    LEAD ASSIGNED <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="assigned_to"
                      name="assigned_to"
                      value={formData.assigned_to}
                      onChange={handleChange}
                      className="w-full h-11 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      <option value={`${currentUsername} (${currentUserRole})`}>
                        {currentUsername} ({currentUserRole})
                      </option>
                      {!usersLoading &&
                        Array.isArray(users) &&
                        users.map((u) => {
                          const val = u.username || u.name || String(u.id);
                          const roleStr = u.role ? ` (${u.role})` : "";
                          return (
                            <option key={u.id || u.username} value={val}>
                              {val}
                              {roleStr}
                            </option>
                          );
                        })}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="call_assigned" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    CALL ASSIGNED <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="call_assigned"
                      name="call_assigned"
                      value={formData.call_assigned}
                      onChange={handleChange}
                      className="w-full h-11 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      <option value={`${currentUsername} (${currentUserRole})`}>
                        {currentUsername} ({currentUserRole})
                      </option>
                      {!usersLoading &&
                        Array.isArray(users) &&
                        users.map((u) => {
                          const val = u.username || u.name || String(u.id);
                          const roleStr = u.role ? ` (${u.role})` : "";
                          return (
                            <option key={u.id || u.username} value={val}>
                              {val}
                              {roleStr}
                            </option>
                          );
                        })}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Pipeline Status & Classification */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[#3B49DF]">
                <TrendingUp className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                  4. Pipeline Status & Classification
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="proposal_status" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    PROPOSAL STATUS
                  </label>
                  <div className="relative">
                    <select
                      id="proposal_status"
                      name="proposal_status"
                      value={formData.proposal_status}
                      onChange={handleChange}
                      className="w-full h-11 pl-3 pr-7 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      {PROPOSAL_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="status" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    STATUS <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full h-11 pl-3 pr-7 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sub_status" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    SUB-STATUS
                  </label>
                  <div className="relative">
                    <select
                      id="sub_status"
                      name="sub_status"
                      value={formData.sub_status}
                      onChange={handleChange}
                      className="w-full h-11 pl-3 pr-7 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      {SUB_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="activity" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    ACTIVITY
                  </label>
                  <div className="relative">
                    <select
                      id="activity"
                      name="activity"
                      value={formData.activity}
                      onChange={handleChange}
                      className="w-full h-11 pl-3 pr-7 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      {ACTIVITY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Timing & Follow-up */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[#3B49DF]">
                <Calendar className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                  5. Timing & Follow-up
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="add_date" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    DATE (LEAD INCEPTION) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="add_date"
                      name="add_date"
                      type="date"
                      value={formData.add_date}
                      onChange={handleChange}
                      className="w-full h-11 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="next_call" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    FOLLOW-UP DATE & TIME
                  </label>
                  <div className="relative">
                    <input
                      id="next_call"
                      name="next_call"
                      type="date"
                      value={formData.next_call}
                      onChange={handleChange}
                      placeholder="dd/mm/yyyy"
                      className="w-full h-11 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Demo Checkbox card */}
              <div className="bg-[#EEF2FF]/60 border border-indigo-100 rounded-[12px] p-4 flex items-start gap-3.5">
                <input
                  type="checkbox"
                  id="demo_scheduled"
                  name="demo_scheduled"
                  checked={Boolean(formData.demo_scheduled)}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="demo_scheduled" className="cursor-pointer select-none">
                  <div className="flex items-center gap-1.5">
                    <MonitorPlay className="w-4 h-4 text-indigo-600" />
                    <span className="text-[13px] font-[600] text-slate-900">
                      Schedule Product / Service Demo
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Check this to reserve an orientation session with the academic counseling team.
                  </p>
                </label>
              </div>
            </div>

            {/* 6. Change Log / Audit Trail */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-0.5">
                <div className="flex items-center gap-2 text-[#3B49DF]">
                  <History className="w-4 h-4 stroke-[2.2]" />
                  <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                    6. Change Log / Audit Trail
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-[600] tracking-wider text-slate-400">
                  ID: AUTOGEN
                </span>
              </div>

              <div className="bg-[#EEF2FF]/60 border border-indigo-100 rounded-[12px] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[12px]">
                  <div className="flex items-center gap-2 font-[600] text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                    Initial Log: Created by {currentUsername} (Just now)
                  </div>
                  <div className="font-mono text-slate-500 text-[11px]">
                    System Timestamp: {todayIso}
                  </div>
                </div>

                <label
                  htmlFor="remarks"
                  className="block text-[11px] font-[700] text-slate-600 uppercase tracking-wider mb-1.5"
                >
                  INITIAL INTAKE NOTES & OBSERVATIONS
                </label>
                <textarea
                  id="remarks"
                  name="remarks"
                  rows={3}
                  value={formData.remarks}
                  onChange={handleChange}
                  placeholder="Add custom notes, student preferences, referral context, or special requirements..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-[8px] text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2 text-slate-600 text-[12px] font-[500]">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Encrypted institutional data record</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-[8px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[13px] font-[500] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-[8px] bg-[#4F46E5] hover:bg-indigo-700 text-white text-[13px] font-[500] flex items-center gap-2 shadow-sm transition-colors"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save Lead</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLeadModal;
