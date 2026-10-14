import React, { useState, useEffect } from "react";
import { X, CheckCircle, School, Calendar, DollarSign, BookOpen, User, Phone, Mail } from "lucide-react";
import { clientService, catalogService } from "../services/api";

export default function EnrollModal({ isOpen, onClose, lead, authToken, onEnrolled }) {
  const [loading, setLoading] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [error, setError] = useState(null);

  // Catalog options from backend
  const [packages, setPackages] = useState([]);
  // syllabi removed — syllabus_type field removed per requirement
  const [classesList, setClassesList] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    principal_name: "",
    principal_number: "",
    principal_email: "",
    contact_name: "",
    contact_number: "",
    contact_email: "",
    mou_start: "",
    mou_end: "",
    first_class_date: "",
    agreed_price: "",
    pricing_basis: "per_month",
    classes_per_week: 2,
    package_type: "",
    // syllabus_type removed per requirement
    included_classes: [],
    exams_count: 0,
    events_count: 0,
  });

  // Load catalogs on open
  useEffect(() => {
    if (!isOpen || !authToken) return;

    let mounted = true;
    setLoadingCatalogs(true);

    const today = new Date().toISOString().split("T")[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Pre-fill from lead
    const defaultPrincipalName = lead?.parents_name || lead?.contact_person || "";
    const defaultPrincipalNumber = lead?.contact_number || lead?.phone_number || lead?.whatsapp_number || "";
    const defaultPrincipalEmail = lead?.email || "";
    const defaultContactName = lead?.contact_person || lead?.parents_name || "";
    const defaultContactNumber = lead?.contact_number || lead?.phone_number || "";
    const defaultContactEmail = lead?.email || "";

    setFormData((prev) => ({
      ...prev,
      principal_name: defaultPrincipalName,
      principal_number: defaultPrincipalNumber,
      principal_email: defaultPrincipalEmail,
      contact_name: defaultContactName,
      contact_number: defaultContactNumber,
      contact_email: defaultContactEmail,
      mou_start: today,
      mou_end: nextYear,
      first_class_date: "",
      agreed_price: "",
      pricing_basis: "per_month",
      classes_per_week: 2,
      package_type: "",
      // syllabus_type removed
      included_classes: [],
      exams_count: 0,
      events_count: 0,
    }));

    Promise.all([
      catalogService.getPackages(authToken).catch(() => []),
      // syllabi no longer needed
      catalogService.getClasses(authToken).catch(() => []),
    ])
      .then(([pkgs, cls]) => {
        if (!mounted) return;
        setPackages(pkgs);
        setClassesList(cls);

        setFormData((prev) => ({
          ...prev,
          package_type: pkgs[0]?.id || "",
          // syllabus_type removed
          included_classes: cls.map((c) => c.id),
        }));
      })
      .finally(() => {
        if (mounted) setLoadingCatalogs(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, lead, authToken]);

  if (!isOpen || !lead) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleClassToggle = (classId) => {
    setFormData((prev) => {
      const current = prev.included_classes;
      if (current.includes(classId)) {
        return { ...prev, included_classes: current.filter((id) => id !== classId) };
      } else {
        return { ...prev, included_classes: [...current, classId] };
      }
    });
  };

  const handleCopyContactToPrincipal = () => {
    setFormData((prev) => ({
      ...prev,
      principal_name: prev.contact_name || lead?.contact_person || "",
      principal_number: prev.contact_number || lead?.contact_number || "",
      principal_email: prev.contact_email || lead?.email || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.principal_name.trim()) {
      setError("Principal name is required.");
      return;
    }
    if (!formData.principal_number.trim()) {
      setError("Principal contact number is required.");
      return;
    }
    if (!formData.principal_email.trim()) {
      setError("Principal email is required.");
      return;
    }
    if (!formData.contact_name.trim() || !formData.contact_number.trim() || !formData.contact_email.trim()) {
      setError("School operational contact details are required.");
      return;
    }
    if (!formData.package_type) {
      setError("Please select a package.");
      return;
    }
    // syllabus_type validation removed
    if (!formData.included_classes.length) {
      setError("Please select at least one class.");
      return;
    }
    if (!formData.agreed_price || Number(formData.agreed_price) <= 0) {
      setError("Agreed price must be greater than 0 NPR.");
      return;
    }
    if (new Date(formData.mou_end) < new Date(formData.mou_start)) {
      setError("MOU end date must be on or after start date.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        lead: lead.id,
        principal_name: formData.principal_name.trim(),
        principal_number: formData.principal_number.trim(),
        principal_email: formData.principal_email.trim(),
        contact_name: formData.contact_name.trim(),
        contact_number: formData.contact_number.trim(),
        contact_email: formData.contact_email.trim(),
        mou_start: formData.mou_start,
        mou_end: formData.mou_end,
        agreed_price: Number(formData.agreed_price),
        pricing_basis: formData.pricing_basis,
        classes_per_week: Number(formData.classes_per_week),
        package_type: Number(formData.package_type),
        // syllabus_type removed per requirement
        included_classes: formData.included_classes,
        exams_count: Number(formData.exams_count || 0),
        events_count: Number(formData.events_count || 0),
        first_class_date: formData.first_class_date || null,
      };

      const result = await clientService.enrollLead(payload, authToken);
      if (onEnrolled) {
        onEnrolled(result, lead);
      }
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to enroll school.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F8FAFC]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#294998] rounded-xl text-white shadow-sm">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Enroll School as Client
              </h2>
              <p className="text-xs text-slate-500">
                {lead.school_name} &bull; <span className="font-mono text-[#294998] font-semibold">{lead.system_id || "SCH-Pending"}</span> &bull; {lead.municipality || lead.district || "Nepal"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Section 1: Principal Details */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#294998]" /> Principal / School Head
              </h3>
              <button
                type="button"
                onClick={handleCopyContactToPrincipal}
                className="text-xs text-[#294998] hover:text-[#1E3776] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                title="Copy details from contact person below"
              >
                Same as Contact Person
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Principal Name *
                </label>
                <input
                  type="text"
                  name="principal_name"
                  value={formData.principal_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Dr. Ramesh Shrestha"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Principal Phone *
                </label>
                <input
                  type="text"
                  name="principal_number"
                  value={formData.principal_number}
                  onChange={handleChange}
                  required
                  placeholder="98XXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Principal Email *
                </label>
                <input
                  type="email"
                  name="principal_email"
                  value={formData.principal_email}
                  onChange={handleChange}
                  required
                  placeholder="principal@school.edu.np"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Operational Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#294998]" /> Operational Point of Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: MOU & Financials */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#294998]" /> MOU & Financial Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  MOU Start Date *
                </label>
                <input
                  type="date"
                  name="mou_start"
                  value={formData.mou_start}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  MOU End Date *
                </label>
                <input
                  type="date"
                  name="mou_end"
                  value={formData.mou_end}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Pricing Basis *
                </label>
                <select
                  name="pricing_basis"
                  value={formData.pricing_basis}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none bg-white"
                >
                  <option value="per_month">Per Month</option>
                  <option value="per_class">Per Class</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Agreed Price (NPR) *
                </label>
                <input
                  type="number"
                  name="agreed_price"
                  value={formData.agreed_price}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="e.g. 45000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Academic Program */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#294998]" /> Curriculum & Classes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Package Type *
                </label>
                <select
                  name="package_type"
                  value={formData.package_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none bg-white capitalize"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Syllabus Type removed per requirement */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Classes per Week *
                </label>
                <input
                  type="number"
                  name="classes_per_week"
                  value={formData.classes_per_week}
                  onChange={handleChange}
                  required
                  min="1"
                  max="14"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
            </div>

            {/* Classes Checkboxes */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Included Classes / Subjects *
              </label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                {classesList.map((cls) => {
                  const isChecked = formData.included_classes.includes(cls.id);
                  return (
                    <button
                      type="button"
                      key={cls.id}
                      onClick={() => handleClassToggle(cls.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isChecked
                          ? "bg-[#294998] text-white shadow-sm"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                      <span className="capitalize">{cls.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 5: Extra Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                First Class Date (Optional)
              </label>
              <input
                type="date"
                name="first_class_date"
                value={formData.first_class_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Included Exams Count
              </label>
              <input
                type="number"
                name="exams_count"
                value={formData.exams_count}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Included Events Count
              </label>
              <input
                type="number"
                name="events_count"
                value={formData.events_count}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingCatalogs}
              className="px-5 py-2.5 bg-[#294998] hover:bg-[#1E3776] text-white rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Converting...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Enrollment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
