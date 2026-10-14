// src/pages/HelpPage.jsx
// Task 7.1: Restructured — removed FAQs, kept only guideline document + contact cards
import React from "react";
import {
  BookOpen,
  Mail,
  Phone,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Info,
  Users,
  BarChart2,
  Archive,
  Settings,
  FileText,
} from "lucide-react";

// Task 7.1: Clean guideline sections
const GUIDELINES = [
  {
    id: "leads",
    icon: Users,
    title: "Managing Leads",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    steps: [
      "Click '+ Add Lead' on the Leads page to create a new school lead.",
      "Fill in required fields: School Name, District, Municipality, Address, Contact Person, and Email.",
      "Contact Number and Landline Number are optional.",
      "Use 'Course Interest' dropdown to select from courses configured in Settings.",
      "Assign the lead to a counsellor using the Lead Owner / Call Assignee fields (admin only).",
      "When deleting a lead, it is moved to Archive — not permanently deleted.",
      "Archived leads can be restored at any time from the Archive page.",
    ],
  },
  {
    id: "activity-log",
    icon: FileText,
    title: "Activity Log (formerly Pipeline)",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
    steps: [
      "Click the calendar icon on any lead row to log an activity.",
      "Required fields: Date, Activity Type, Followup Date, Remarks.",
      "Substatus can only be changed through the Activity Log form.",
      "Click the eye icon on a lead row to view the full read-only Activity Log.",
      "From the view, click 'Edit' to make changes to existing activities.",
      "The Outcome field has been removed — use Remarks for outcome notes.",
      "'Details' field (formerly Source) captures additional interaction notes.",
    ],
  },
  {
    id: "clients",
    icon: CheckCircle,
    title: "Managing Clients",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    steps: [
      "Leads become Clients once their status is set to 'Converted'.",
      "Client detail pages are view-only by default — click 'Edit' to make changes.",
      "Use the 'Renew' button on a client record to: move back to Leads (Accepts), keep as Client (Continue), or Archive (Not Interested).",
      "Payment section has been removed from client management.",
      "Use the 'Assigned Package' filter to find clients by package.",
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "Settings",
    color: "bg-amber-50 text-amber-600 border-amber-100",
    steps: [
      "Navigate to Settings to manage Users, Courses, and Packages.",
      "Add courses in Settings → Courses; they will appear in the Course Interest dropdowns across the CRM.",
      "Package settings: Status and Phase fields have been removed. Client Date and NPR currency are now available.",
      "NPR (Nepalese Rupee) is set as the default currency.",
      "Activity Types and Substatuses can be configured from Settings.",
    ],
  },
  {
    id: "reports",
    icon: BarChart2,
    title: "Reports & Exports",
    color: "bg-purple-50 text-purple-600 border-purple-100",
    steps: [
      "Go to Reports to view and generate lead/client reports.",
      "Use the date range filter to narrow report data.",
      "Click 'Generate Report' to build a report, then 'Download PDF' to export.",
      "All report fields are included in the PDF output.",
      "CSV export is available from the Leads page — use the Export button in the toolbar.",
      "Exported files appear in the Downloads page.",
    ],
  },
  {
    id: "csv",
    icon: Archive,
    title: "CSV Import",
    color: "bg-slate-50 text-slate-600 border-slate-200",
    steps: [
      "Use the 'Import CSV' button on the Leads or Clients page.",
      "Required CSV columns: school_name, district, municipality, address, contact_person, email.",
      "Optional columns: contact_number, alt_number (landline), alt_contact_person, social_media, source, course_interest, sub_status.",
      "Ensure the CSV uses UTF-8 encoding and the header row matches exactly.",
      "Download the CSV template from the Downloads page for reference.",
      "Rows with missing required fields will be skipped and reported in the import summary.",
    ],
  },
];

const contactOptions = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Send us an email and we'll get back to you within 24 hours.",
    action: "support@merocoding.com",
    href: "mailto:support@merocoding.com",
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "Available Monday–Friday, 9 AM – 6 PM NPT.",
    action: "+977 980-000-0000",
    href: "tel:+9779800000000",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    description: "Chat with our support team in real time.",
    action: "Start a chat",
    href: "#",
  },
];

// Task 7.1: Guideline section component
const GuidelineSection = ({ section }) => {
  const Icon = section.icon;
  return (
    <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
      <div className={`flex items-center gap-3 px-5 py-4 border-b border-slate-100 ${section.color.split(" ")[0]}`}>
        <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${section.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-[14px] font-[700] text-slate-900">{section.title}</h2>
      </div>
      <div className="px-5 py-4">
        <ol className="space-y-2.5">
          {section.steps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#EDF2FC] text-[#294998] text-[11px] font-[700] flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>
              <span className="text-[13px] text-slate-600 leading-[1.6]">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

const HelpPage = () => {
  return (
    <div className="bg-[#F8FAFC] min-h-full">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-[20px] font-[600] leading-[28px] tracking-[-0.015em] text-slate-900">
          Help &amp; Support
        </h1>
        <p className="text-[13px] text-slate-500 leading-[18px] mt-0.5">
          CRM user guidelines and support contacts
        </p>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {contactOptions.map(({ icon: Icon, title, description, action, href }) => (
            <a
              key={title}
              href={href}
              className="bg-white rounded-[12px] border border-slate-200 p-5 hover:border-[#CDDBF6] hover:shadow-sm transition-all group"
            >
              <div className="w-9 h-9 rounded-[10px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center mb-3">
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-[13px] font-[600] text-slate-900 mb-1">{title}</p>
              <p className="text-[12px] text-slate-400 leading-[1.6] mb-3">{description}</p>
              <span className="inline-flex items-center gap-1 text-[12px] font-[500] text-[#294998] group-hover:underline">
                {action}
                <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          ))}
        </div>

        {/* Task 7.1: Guideline Document Header */}
        <div className="bg-gradient-to-r from-[#294998] to-[#1E3776] rounded-[12px] p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 opacity-90" />
            <h2 className="text-[16px] font-[700]">MeroCoding CRM — User Guidelines</h2>
          </div>
          <p className="text-[13px] text-white/70 leading-[1.6]">
            Step-by-step instructions for every major feature of the CRM system. Follow these guidelines to manage leads, clients, activities, and reports effectively.
          </p>
        </div>

        {/* Task 7.1: Guideline Sections — FAQs removed */}
        <div className="space-y-4">
          {GUIDELINES.map((section) => (
            <GuidelineSection key={section.id} section={section} />
          ))}
        </div>

        {/* Quick Reference Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-[600] text-amber-800 mb-1">Important Notes</p>
            <ul className="text-[12px] text-amber-700 space-y-1 leading-relaxed">
              <li>• All lead deletions are soft-deletes — data is moved to Archive, never permanently removed.</li>
              <li>• Substatus can only be changed via the Activity Log form, not from the view.</li>
              <li>• NPR (Nepalese Rupee) is the default currency for all packages.</li>
              <li>• Activity Type dropdown options are configured in Settings.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
