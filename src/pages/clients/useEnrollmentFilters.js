import { useState } from "react";

export default function useEnrollmentFilters(allClients, initialSearch = "") {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  return {
    searchQuery,
    setSearchQuery,
    filteredClients: Array.isArray(allClients) ? allClients : [],
  };
}
