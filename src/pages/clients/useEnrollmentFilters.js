import { useState } from "react";

export default function useEnrollmentFilters(allStudents, initialSearch = "") {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  return {
    searchQuery,
    setSearchQuery,
    filteredStudents: Array.isArray(allStudents) ? allStudents : [],
  };
}
