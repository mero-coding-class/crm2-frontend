import React, { useState } from "react";
import {
  HelpCircle,
  MessageSquare,
  BookOpen,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

const faqs = [
  {
    question: "How do I add a new lead?",
    answer:
      "Navigate to the Leads page and click the '+ Add Lead' button in the top-right corner. Fill in the student's details and click Save.",
  },
  {
    question: "How do I assign a lead to a sales rep?",
    answer:
      "Open the lead in the Leads table, find the 'Assigned To' column, and select a team member from the dropdown. The assignment is saved automatically.",
  },
  {
    question: "How do I archive a lead?",
    answer:
      "Click the archive/delete icon on the lead row in the Leads table. A confirmation dialog will appear. Archived leads can be restored from the Archive page at any time.",
  },
  {
    question: "How do I convert a lead to an enrolled student?",
    answer:
      "Change the lead's status to 'Converted' from the status dropdown. An invoice is required before converting. Once converted, the student will appear in the Clients section.",
  },
  {
    question: "How do I generate a report?",
    answer:
      "Go to Reports, optionally select a date range using the filter, then click 'Generate Report' on the right side of the filter card. You can also download the report as a PDF.",
  },
  {
    question: "How do I export lead data?",
    answer:
      "In the Leads page, use the Export button in the toolbar. Exported files are saved to the Downloads page for later access.",
  },
  {
    question: "How do I add a new user account?",
    answer:
      "Admins can create new users from Settings → Users section. Enter the username, role, and password, then click Create User.",
  },
  {
    question: "Can I restore an archived lead?",
    answer:
      "Yes. Go to the Archive page, find the lead, and click the Restore button. The lead will be moved back to the active Leads list.",
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

const FAQItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-[13px] font-[500] text-slate-800">{question}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <p className="px-5 pb-4 text-[13px] text-slate-500 leading-[1.7]">{answer}</p>
      )}
    </div>
  );
};

const HelpPage = () => {
  return (
    <div className="bg-[#F8FAFC] min-h-full">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-[20px] font-[600] leading-[28px] tracking-[-0.015em] text-slate-900">
          Help & Support
        </h1>
        <p className="text-[13px] text-slate-500 leading-[18px] mt-0.5">
          Find answers, get in touch, or browse documentation
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

        {/* FAQ */}
        <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-[8px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[14px] font-[600] text-slate-900">Frequently Asked Questions</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">Common questions about using the CRM</p>
            </div>
          </div>
          <div>
            {faqs.map((faq) => (
              <FAQItem key={faq.question} {...faq} />
            ))}
          </div>
        </div>

        {/* Documentation */}
        <div className="bg-white rounded-[12px] border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-[10px] bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-[600] text-slate-900">Documentation</p>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Browse the full user guide for detailed walkthroughs of every feature.
            </p>
          </div>
          <a
            href="#"
            className="h-9 px-4 bg-[#294998] hover:bg-[#1E3776] text-white text-[12px] font-[500] rounded-[8px] transition-colors flex items-center gap-2 shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            View Docs
          </a>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
