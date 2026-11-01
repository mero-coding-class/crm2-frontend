import React, { useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth.js";
import useAddLeadForm, {
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
  TrendingUp,
  BookOpen,
  ShieldCheck,
  Check,
  ChevronDown,
  Headphones,
} from "lucide-react";

const AddLeadModal = ({ onClose, onSave, authToken, classes = [], classLoadError = "" }) => {
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
  const { users, usersLoading } = useUsers(authToken, isAdmin);

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

  const classChoices = Array.isArray(classes) ? classes : [];

  // Task 2.2: Render user display name without email in parentheses
  const formatUserLabel = (u) => {
    // Show only name/username, no email or role in parentheses
    return u.first_name && u.last_name
      ? `${u.first_name} ${u.last_name}`
      : u.username || u.email || String(u.id);
  };

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
            <div className="w-12 h-12 rounded-[14px] bg-primary flex items-center justify-center text-white shadow-sm shrink-0">
              <UserPlus className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Add New Lead
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-light text-primary">
                  B2B CRM
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
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
            {errors?.general && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {errors.general}
              </div>
            )}

            {/* 1. School / Institution Info */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-primary">
                <Building2 className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-sm font-bold text-slate-900 tracking-[-0.01em]">
                  1. School / Institution Info
                </h3>
              </div>

              {/* School Name → backend: school_name */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
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
                  maxLength={255}
                  value={formData.school_name}
                  onChange={handleChange}
                  placeholder="Enter school / institution name"
                  className="w-full h-11 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
                {errors?.school_name && (
                  <p className="text-xs text-rose-500">{errors.school_name}</p>
                )}
              </div>

              {/* District & Municipality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="district" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    DISTRICT <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="district"
                    name="district"
                    type="text"
                    maxLength={100}
                    value={formData.district}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Kathmandu"
                    className="w-full h-11 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                  {errors?.district && (
                    <p className="text-xs text-rose-500">{errors.district}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="municipality" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    MUNICIPALITY / LOCAL BODY <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="municipality"
                    name="municipality"
                    type="text"
                    required
                    maxLength={100}
                    value={formData.municipality}
                    onChange={handleChange}
                    placeholder="e.g. Kathmandu Metropolitan City"
                    className="w-full h-11 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                  {errors?.municipality && (
                    <p className="text-xs text-rose-500">{errors.municipality}</p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label htmlFor="address" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ADDRESS <span className="text-rose-500">*</span>
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  maxLength={255}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address, ward no., landmark..."
                  className="w-full h-11 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
                {errors?.address && (
                  <p className="text-xs text-rose-500">{errors.address}</p>
                )}
              </div>
            </div>

            {/* 2. Primary Contact Details */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-primary">
                <Contact className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-sm font-bold text-slate-900 tracking-[-0.01em]">
                  2. Primary Contact Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Person */}
                <div className="space-y-1.5">
                  <label htmlFor="contact_person" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    CONTACT PERSON <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="contact_person"
                      name="contact_person"
                      type="text"
                      required
                      maxLength={255}
                      value={formData.contact_person}
                      onChange={handleChange}
                      placeholder="Principal / Coordinator name"
                      className="w-full h-11 pl-10 pr-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {errors?.contact_person && (
                    <p className="text-xs text-rose-500">{errors.contact_person}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact_number" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    CONTACT NUMBER <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="contact_number"
                      name="contact_number"
                      type="tel"
                      required
                      maxLength={32}
                      inputMode="tel"
                      title="Enter exactly 10 local digits. A +977 country code is accepted."
                      value={formData.contact_number}
                      onChange={handleChange}
                      placeholder="+977 98XXXXXXXX"
                      className="w-full h-11 pl-10 pr-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {errors?.contact_number && (
                    <p className="text-xs text-rose-500">{errors.contact_number}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Alternate Contact Person */}
                <div className="space-y-1.5">
                  <label htmlFor="alt_contact_person" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    ALT. CONTACT PERSON
                  </label>
                  <input
                    id="alt_contact_person"
                    name="alt_contact_person"
                    type="text"
                    maxLength={255}
                    value={formData.alt_contact_person}
                    onChange={handleChange}
                    placeholder="Secondary contact name"
                    className="w-full h-11 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Keep the alternate mobile and landline fields separate. */}
                <div className="space-y-1.5">
                  <label htmlFor="landline" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    LANDLINE NUMBER
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="landline"
                      name="landline"
                      type="tel"
                      maxLength={32}
                      inputMode="tel"
                      title="Enter a landline with 7 to 10 local digits."
                      value={formData.landline}
                      onChange={handleChange}
                      placeholder="01-XXXXXXX"
                      className="w-full h-11 pl-10 pr-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {errors?.landline && (
                    <p className="text-xs text-rose-500">{errors.landline}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="alt_number" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ALTERNATE NUMBER
                </label>
                <input
                  id="alt_number"
                  name="alt_number"
                  type="tel"
                  maxLength={32}
                  inputMode="tel"
                  value={formData.alt_number}
                  onChange={handleChange}
                  placeholder="Alternate mobile number"
                  className="w-full h-11 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
                {errors?.alt_number && <p className="text-xs text-rose-500">{errors.alt_number}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    EMAIL ADDRESS <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      maxLength={254}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="official@school.edu.np"
                      className="w-full h-11 pl-10 pr-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {errors?.email && (
                    <p className="text-xs text-rose-500">{errors.email}</p>
                  )}
                </div>

                {/* Social Media → backend: social_media */}
                <div className="space-y-1.5">
                  <label htmlFor="social_media" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    SOCIAL MEDIA / WEBSITE
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="social_media"
                      name="social_media"
                      type="text"
                      maxLength={500}
                      value={formData.social_media}
                      onChange={handleChange}
                      placeholder="LinkedIn, Facebook, or Website URL"
                      className="w-full h-11 pl-10 pr-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Class interest uses the shared Class Catalog. */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-primary">
                <BookOpen className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-sm font-bold text-slate-900 tracking-[-0.01em]">
                  3. Class Interest
                </h3>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="course_interest" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  CLASS INTEREST
                </label>
                <select
                  id="course_interest"
                  name="course_interest"
                  multiple
                  value={(formData.course_interest || "").split(",").map((value) => value.trim()).filter(Boolean)}
                  onChange={(event) => setField("course_interest", Array.from(event.target.selectedOptions, (option) => option.value).join(", "))}
                  disabled={!classChoices.length}
                  aria-describedby="course-interest-help"
                  className="min-h-24 w-full rounded-[10px] bg-canvas-subtle/70 px-3.5 py-2 text-sm text-slate-800 focus:border-primary focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {classChoices.map((item) => {
                    const name = item.class_name || item.name || "";
                    return <option key={item.id} value={name}>{name}</option>;
                  })}
                </select>
                <p id="course-interest-help" className="text-xs text-slate-500">
                  {classLoadError || (classChoices.length ? "Select one or more classes from the catalog." : "No active classes are available in the catalog.")}
                </p>
              </div>
            </div>

            {/* 4. Lead & Counselor Assignment (admin only) */}
            {isAdmin && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-primary">
                  <Headphones className="w-4 h-4 stroke-[2.2]" />
                  <h3 className="text-sm font-bold text-slate-900 tracking-[-0.01em]">
                    4. Lead Owner
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="owner" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      LEAD OWNER
                    </label>
                    <div className="relative">
                      <select
                        id="owner"
                        name="owner"
                        value={formData.owner}
                        onChange={handleChange}
                        className="w-full h-11 pl-3.5 pr-8 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                      >
                        <option value="">Assign to self (default)</option>
                        {!usersLoading && Array.isArray(users) && users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {formatUserLabel(u)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 5. Activity Log Status (formerly Pipeline Status) */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-sm font-bold text-slate-900 tracking-[-0.01em]">
                  {isAdmin ? "5." : "4."} Activity Log Status
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Source — admin only */}
                {isAdmin && (
                <div className="space-y-1.5">
                  <label htmlFor="source" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    SOURCE
                  </label>
                  <div className="relative">
                    <select
                      id="source"
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      className="w-full h-11 pl-3 pr-7 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      <option value="">Select Source</option>
                      {SOURCE_CHOICES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                )}

                {/* Sub-Status — always locked to "New" when adding a lead */}
                {/* Sub-status can only be changed via Activity Log after creation */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    SUB-STATUS
                  </label>
                  <div className="h-11 px-3 flex items-center gap-2 rounded-[10px] bg-canvas-subtle/50 border border-transparent">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      New
                    </span>
                    <span className="text-xs text-slate-400">
                      Changes after first activity log
                    </span>
                  </div>
                  {/* Hidden input keeps sub_status = "New" in form state */}
                  <input type="hidden" name="sub_status" value="New" />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Encrypted institutional data record</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-[8px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-[8px] bg-primary hover:bg-primary-hover text-white text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
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
