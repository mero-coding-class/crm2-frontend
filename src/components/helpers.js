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

export const normalizeCourse = (s = "") =>
  s.toString().toLowerCase().replace(/[^a-z]/g, "");

export const getCourseClasses = (courseName) => {
  if (!courseName) return "bg-gray-100 text-gray-800 border-gray-200";
  const n = normalizeCourse(courseName);

  if (n.startsWith("python") && (n.includes("begin") || n.includes("begine")))
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (n.startsWith("python") && (n.includes("adv") || n.includes("advance")))
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (n.startsWith("scratch") && (n.includes("begin") || n.includes("begine")))
    return "bg-orange-100 text-orange-800 border-orange-200";
  if (n.startsWith("scratch") && (n.includes("adv") || n.includes("advance")))
    return "bg-orange-200 text-orange-900 border-orange-300";
  if (n.includes("htmlcss") || (n.includes("html") && n.includes("css")))
    return "bg-blue-100 text-blue-800 border-blue-200";
  if (n.includes("webdevelopment") || n.includes("webdev"))
    return "bg-sky-100 text-sky-800 border-sky-200";
  if (n.includes("robotics")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (n.includes("datascience") || (n.includes("data") && n.includes("science")))
    return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200";
  if (
    n.includes("advanceai") ||
    n.includes("advancedai") ||
    (n.includes("ai") && n.includes("adv"))
  )
    return "bg-purple-100 text-purple-800 border-purple-200";

  return "bg-gray-100 text-gray-800 border-gray-200";
};

export const getStatusClasses = (status) => {
  const s = (status || "").toString().trim().toLowerCase();
  switch (s) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "converted":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "lost":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

  export const getSubStatusClasses = (subStatus) => {
    switch (subStatus) {
      case "New":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "Open":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Followup":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "inProgress":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Average":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "Interested":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Junk":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
