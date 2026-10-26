import React, { useState, useEffect } from "react";
import { X, CheckCircle, School, Calendar, DollarSign, BookOpen, User, Phone, Mail, MapPin } from "lucide-react";
import { clientService, catalogService } from "../services/api";
import { isValidEmail, isValidPhoneNumber } from "../utils/validation";

export default function ClientEditModal({ isOpen, onClose, client, authToken, teachers = [], onSave }) {
  const [loading, setLoading] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [error, setError] = useState(null);

  const [packages, setPackages] = useState([]);

  const [formData, setFormData] = useState({
    principal_name: "",
    principal_number: "",
    principal_email: "",
    contact_name: "",
    contact_number: "",
    contact_email: "",
    district: "",
    municipality: "",
    mou_start: "",
    mou_end: "",
    agreed_price: "",
    pricing_basis: "per_month",
    classes_per_week: 2,
    assigned_to: "",
    package_type: "",
    exams_count: 0,
    events_count: 0,
  });

  useEffect(() => {
    if (!isOpen || !client) return;

    let mounted = true;
    setLoadingCatalogs(true);
    setError(null);

    setFormData({
      principal_name: client.principal_name || "",
      principal_number: client.principal_number || "",
      principal_email: client.principal_email || "",
      contact_name: client.contact_name || "",
      contact_number: client.contact_number || "",
      contact_email: client.contact_email || "",
      district: client.district || "",
      municipality: client.municipality || "",
      mou_start: client.mou_start ? String(client.mou_start).split("T")[0] : "",
      mou_end: client.mou_end ? String(client.mou_end).split("T")[0] : "",
      agreed_price: client.agreed_price ?? "",
      pricing_basis: client.pricing_basis || "per_month",
      classes_per_week: client.classes_per_week || 2,
      assigned_to: client.assigned_to?.id ?? client.assigned_to ?? "",
      package_type: client.package_type || "",
      exams_count: client.exams_count || 0,
      events_count: client.events_count || 0,
    });

    Promise.all([
      catalogService.getPackages(authToken).catch(() => []),
    ])
      .then(([pkgs]) => {
        if (!mounted) return;
        setPackages(pkgs);
        if (!client.package_type && pkgs[0]) {
          setFormData((prev) => ({ ...prev, package_type: pkgs[0].id }));
        }
      })
      .finally(() => {
        if (mounted) setLoadingCatalogs(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, client, authToken]);

  if (!isOpen || !client) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const requiredFields = [
      "principal_name", "principal_number", "principal_email",
      "contact_name", "contact_number", "contact_email",
      "district", "municipality", "mou_start", "mou_end",
    ];
    const missingField = requiredFields.find((field) => !String(formData[field] ?? "").trim());
    if (missingField) {
      setError(`${missingField.replaceAll("_", " ")} is required.`);
      return;
    }
    if (!isValidPhoneNumber(formData.principal_number) || !isValidPhoneNumber(formData.contact_number)) {
      setError("Principal and contact phone numbers must contain exactly 10 local digits. +977 is accepted.");
      return;
    }
    if (!isValidEmail(formData.principal_email) || !isValidEmail(formData.contact_email)) {
      setError("Enter valid principal and contact email addresses.");
      return;
    }
    const maxLengths = {
      principal_name: 255, principal_number: 32, principal_email: 254,
      contact_name: 255, contact_number: 32, contact_email: 254,
      district: 100, municipality: 100,
    };
    const tooLong = Object.entries(maxLengths).find(([field, limit]) =>
      String(formData[field] || "").trim().length > limit
    );
    if (tooLong) {
      setError(`${tooLong[0].replaceAll("_", " ")} must be ${tooLong[1]} characters or fewer.`);
      return;
    }
    if (!Number.isInteger(Number(formData.agreed_price)) || Number(formData.agreed_price) < 0) {
      setError("Agreed price must be a non-negative whole number.");
      return;
    }
    if (!Number.isInteger(Number(formData.classes_per_week)) || Number(formData.classes_per_week) < 1 || Number(formData.classes_per_week) > 14) {
      setError("Classes per week must be a whole number from 1 to 14.");
      return;
    }
    if (![formData.exams_count, formData.events_count].every((value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 32767)) {
      setError("Exam and event counts must be whole numbers from 0 to 32,767.");
      return;
    }

    if (new Date(formData.mou_end) < new Date(formData.mou_start)) {
      setError("MOU end date must be on or after start date.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        principal_name: formData.principal_name.trim(),
        principal_number: formData.principal_number.trim(),
        principal_email: formData.principal_email.trim(),
        contact_name: formData.contact_name.trim(),
        contact_number: formData.contact_number.trim(),
        contact_email: formData.contact_email.trim(),
        district: formData.district.trim(),
        municipality: formData.municipality.trim(),
        mou_start: formData.mou_start,
        mou_end: formData.mou_end,
        agreed_price: Number(formData.agreed_price),
        pricing_basis: formData.pricing_basis,
        classes_per_week: Number(formData.classes_per_week),
        assigned_to: formData.assigned_to === "" ? null : Number(formData.assigned_to),
        package_type: Number(formData.package_type),
        exams_count: Number(formData.exams_count || 0),
        events_count: Number(formData.events_count || 0),
      };

      const updated = await clientService.updateClient(client.id, payload, authToken);
      if (onSave) {
        onSave({ ...client, ...payload, ...updated });
      }
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to update client details.");
    } finally {
      setLoading(false);
    }
  };

  const schoolName = client.school_name || "School Client";
  const systemId = client.system_id || "SCH-000";
  const currentAssignedId = client.assigned_to?.id ?? client.assigned_to;
  const hasCurrentTeacher = teachers.some(
    (teacher) => String(teacher.id) === String(currentAssignedId)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#EDF2FC]/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#294998] rounded-xl text-white shadow-sm">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Edit Client Details
              </h2>
              <p className="text-xs text-slate-500">
                {schoolName} &bull; <span className="font-mono text-[#294998] font-semibold">{systemId}</span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Section 1: Principal Details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#294998]" /> Principal / School Head
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Principal Name
                </label>
                <input
                  type="text"
                  name="principal_name"
                  value={formData.principal_name}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Principal Phone
                </label>
                <input
                  type="tel"
                  name="principal_number"
                  value={formData.principal_number}
                  onChange={handleChange}
                  required
                  maxLength={32}
                  inputMode="tel"
                  title="Enter exactly 10 local digits. A +977 country code is accepted."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Principal Email
                </label>
                <input
                  type="email"
                  name="principal_email"
                  value={formData.principal_email}
                  onChange={handleChange}
                  required
                  maxLength={254}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Operational Contact & Location */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#294998]" /> Operational Contact & Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  required
                  maxLength={32}
                  inputMode="tel"
                  title="Enter exactly 10 local digits. A +977 country code is accepted."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  required
                  maxLength={254}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  District
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Municipality
                </label>
                <input
                  type="text"
                  name="municipality"
                  value={formData.municipality}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: MOU & Financials */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#294998]" /> MOU & Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  MOU Start Date
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
                  MOU End Date
                </label>
                <input
                  type="date"
                  name="mou_end"
                  value={formData.mou_end}
                  onChange={handleChange}
                  required
                  min={formData.mou_start || undefined}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Pricing Basis
                </label>
                <select
                  name="pricing_basis"
                  value={formData.pricing_basis}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none bg-white"
                >
                  <option value="per_month">Per Month</option>
                  <option value="per_class">Per Class</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Agreed Price (NPR)
                </label>
                <input
                  type="number"
                  name="agreed_price"
                  value={formData.agreed_price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Academic Program — Syllabus Type removed per requirement */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#294998]" /> Package & Program
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Package Type
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
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Classes per Week
                </label>
                <input
                  type="number"
                  name="classes_per_week"
                  value={formData.classes_per_week}
                  onChange={handleChange}
                  required
                  min="1"
                  max="14"
                  step="1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Academic User
                </label>
                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none bg-white"
                >
                  <option value="">Unassigned</option>
                  {currentAssignedId != null && !hasCurrentTeacher && (
                    <option value={currentAssignedId}>
                      {client.assigned_to_name || currentAssignedId}
                    </option>
                  )}
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Exams Count
                </label>
                <input
                  type="number"
                  name="exams_count"
                  value={formData.exams_count}
                  onChange={handleChange}
                  required
                  min="0"
                  max="32767"
                  step="1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Events Count
                </label>
                <input
                  type="number"
                  name="events_count"
                  value={formData.events_count}
                  onChange={handleChange}
                  required
                  min="0"
                  max="32767"
                  step="1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#294998]/15 focus:border-[#294998] outline-none"
                />
              </div>
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
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
