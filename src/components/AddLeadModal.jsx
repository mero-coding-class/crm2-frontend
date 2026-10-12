import React, { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import useAddLeadForm, {
  STATUS_CHOICES,
  SUB_STATUS_CHOICES,
  SOURCE_CHOICES,
} from "./addLead/useAddLeadForm";
import useUsers from "../pages/leads/useUsers";
import {
  UserPlus,
  X,
  Building2,
  Contact,
  User,
  Phone,
  Mail,
  Link2,
  Headphones,
  TrendingUp,
  BookOpen,
  ShieldCheck,
  Check,
  ChevronDown,
} from "lucide-react";

const NEPAL_DISTRICTS = [
  "Kathmandu", "Lalitpur", "Bhaktapur", "Kaski (Pokhara)", "Chitwan",
  "Rupandehi (Butwal)", "Morang (Biratnagar)", "Jhapa", "Sunsari (Dharan)",
  "Banke (Nepalgunj)", "Kailali (Dhangadhi)", "Dhanusha (Janakpur)",
  "Parsa (Birgunj)", "Makwanpur (Hetauda)", "Kavrepalanchok", "Gorkha",
  "Tanahun", "Nawalparasi", "Dang", "Surkhet", "Sindhupalchok",
  "Nuwakot", "Dhading", "Palpa", "Lamjung", "Syangja", "Ilam",
  "Kanchanpur", "Bardiya",
];

const AddLeadModal = ({ onClose, onSave, authToken }) => {
  const { user } = useAuth();
  const isAdmin =
    user &&
    (user.role === "admin" ||
      user.role === "super admin" ||
      user.role === "superadmin" ||
      user.role === "super-admin");

  const { formData, setField, errors, handleSubmit } = useAddLeadForm({
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
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  const handleOverlayClick = (event) => {
    if (modalContentRef.current && !modalContentRef.current.contains(event.target)) {
      if (!errors || Object.keys(errors).length === 0) onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setField(name, value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await handleSubmit();
  };

  const currentUsername = user?.username || "User";
  const currentUserRole = user?.role || "Staff";

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
            <div className="w-12 h-12 rounded-[14px] bg-[#294998] flex items-center justify-center text-white shadow-sm shrink-0">
              <UserPlus className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[19px] font-[700] text-slate-900 leading-tight">
                  Add New Lead
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[600] bg-[#EDF2FC] text-[#294998]">
                  B2B CRM
                </span>
              </div>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Enter school details, contact info, and pipeline status.
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
              <div className="flex items-center gap-2 text-[#294998]">
                <Building2 className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                  1. School / Institution Info
                </h3>
              </div>

              {/* School Name → backend: school_name */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-[700]">
                  <label htmlFor="school_name" className="text-slate-700 uppercase tracking-wider">
                    SCHOOL NAME <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-slate-400 font-normal lowercase">full registered title</span>
                </div>
                <input
                  id="school_name"
                  name="school_name"
                  type="text"
                  required
                  value={formData.school_name}
                  onChange={handleChange}
                  placeholder="Enter school / institution name"
                  className="w-full h-11 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
                {errors?.school_name && (
                  <p className="text-[11px] text-rose-500">{errors.school_name}</p>
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
                      required
                      className="w-full h-11 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      <option value="">Select District</option>
                      {NEPAL_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errors?.district && (
                    <p className="text-[11px] text-rose-500">{errors.district}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="municipality" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    MUNICIPALITY / LOCAL BODY <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="municipality"
                    name="municipality"
                    type="text"
                    required
                    value={formData.municipality}
                    onChange={handleChange}
                    placeholder="e.g. Kathmandu Metropolitan City"
                    className="w-full h-11 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                  {errors?.municipality && (
                    <p className="text-[11px] text-rose-500">{errors.municipality}</p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label htmlFor="address" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                  ADDRESS <span className="text-rose-500">*</span>
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address, ward no., landmark..."
                  className="w-full h-11 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
                {errors?.address && (
                  <p className="text-[11px] text-rose-500">{errors.address}</p>
                )}
              </div>
            </div>

            {/* 2. Primary Contact Details */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[#294998]">
                <Contact className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                  2. Primary Contact Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Person */}
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
                      placeholder="Principal / Coordinator name"
                      className="w-full h-11 pl-10 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {errors?.contact_person && (
                    <p className="text-[11px] text-rose-500">{errors.contact_person}</p>
                  )}
                </div>

                {/* Contact Number */}
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
                      className="w-full h-11 pl-10 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {errors?.contact_number && (
                    <p className="text-[11px] text-rose-500">{errors.contact_number}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Alternate Contact Person */}
                <div className="space-y-1.5">
                  <label htmlFor="alt_contact_person" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    ALT. CONTACT PERSON
                  </label>
                  <input
                    id="alt_contact_person"
                    name="alt_contact_person"
                    type="text"
                    value={formData.alt_contact_person}
                    onChange={handleChange}
                    placeholder="Secondary contact name"
                    className="w-full h-11 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Alt Number */}
                <div className="space-y-1.5">
                  <label htmlFor="alt_number" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    ALT. NUMBER
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="alt_number"
                      name="alt_number"
                      type="text"
                      value={formData.alt_number}
                      onChange={handleChange}
                      placeholder="+977 98XXXXXXXX"
                      className="w-full h-11 pl-10 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
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
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="official@school.edu.np"
                      className="w-full h-11 pl-10 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {errors?.email && (
                    <p className="text-[11px] text-rose-500">{errors.email}</p>
                  )}
                </div>

                {/* Social Media → backend: social_media */}
                <div className="space-y-1.5">
                  <label htmlFor="social_media" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    SOCIAL MEDIA / WEBSITE
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="social_media"
                      name="social_media"
                      type="text"
                      value={formData.social_media}
                      onChange={handleChange}
                      placeholder="LinkedIn, Facebook, or Website URL"
                      className="w-full h-11 pl-10 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Course Interest */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[#294998]">
                <BookOpen className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                  3. Course Interest
                </h3>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="course_interest" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                  COURSE / PROGRAMME INTEREST
                </label>
                <input
                  id="course_interest"
                  name="course_interest"
                  type="text"
                  value={formData.course_interest}
                  onChange={handleChange}
                  placeholder="e.g. Robotics, Coding Bootcamp, AI for Schools..."
                  className="w-full h-11 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 4. Lead & Counselor Assignment (admin only) */}
            {isAdmin && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-[#294998]">
                  <Headphones className="w-4 h-4 stroke-[2.2]" />
                  <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                    4. Lead & Counselor Assignment
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Owner (Lead Assigned) */}
                  <div className="space-y-1.5">
                    <label htmlFor="owner" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                      LEAD OWNER (B2B)
                    </label>
                    <div className="relative">
                      <select
                        id="owner"
                        name="owner"
                        value={formData.owner}
                        onChange={handleChange}
                        className="w-full h-11 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                      >
                        <option value="">Assign to self (default)</option>
                        {!usersLoading && Array.isArray(users) && users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.username || u.email} {u.role ? `(${u.role})` : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Call Assignee */}
                  <div className="space-y-1.5">
                    <label htmlFor="call_assignee" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                      CALL ASSIGNEE (B2C)
                    </label>
                    <div className="relative">
                      <select
                        id="call_assignee"
                        name="call_assignee"
                        value={formData.call_assignee}
                        onChange={handleChange}
                        className="w-full h-11 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                      >
                        <option value="">None</option>
                        {!usersLoading && Array.isArray(users) && users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.username || u.email} {u.role ? `(${u.role})` : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Pipeline Status */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[#294998]">
                <TrendingUp className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-[14px] font-[700] text-slate-900 tracking-[-0.01em]">
                  {isAdmin ? "5." : "4."} Pipeline Status
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Source */}
                <div className="space-y-1.5">
                  <label htmlFor="source" className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider">
                    SOURCE
                  </label>
                  <div className="relative">
                    <select
                      id="source"
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      className="w-full h-11 pl-3 pr-7 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      <option value="">Select Source</option>
                      {SOURCE_CHOICES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Sub-Status */}
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
                      className="w-full h-11 pl-3 pr-7 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      {SUB_STATUS_CHOICES.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2 text-slate-600 text-[12px] font-[500]">
              <ShieldCheck className="w-4 h-4 text-[#294998]" />
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
                className="px-6 py-2.5 rounded-[8px] bg-[#294998] hover:bg-[#1E3776] text-white text-[13px] font-[500] flex items-center gap-2 shadow-sm transition-colors"
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
