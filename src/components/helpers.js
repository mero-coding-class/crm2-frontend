// src/components/helpers.js

export const getFormattedDate = (dateString) => {
  if (!dateString || dateString === "N/A") return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

export const formatTimestamp = (timestampString) => {
  if (!timestampString) return "N/A";
  const date = new Date(timestampString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleString();
};

export const getStatusClasses = (status) => {
  const s = (status || "").toString().trim().toLowerCase();
  switch (s) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "enrolled":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "not_interested":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

  export const getSubStatusClasses = (subStatus) => {
    // crm2-backend SUB_STATUS_CHOICES
    switch (subStatus) {
      case "New":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "Contacted":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Follow-up":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Visit scheduled":
        return "bg-violet-100 text-violet-800 border-violet-200";
      case "Demo scheduled":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Proposal sent":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Interested":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "On hold":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };
