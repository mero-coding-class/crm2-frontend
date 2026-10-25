import { useMemo, useState } from "react";
import { deduplicateLeads } from "./utils";

export default function useLeadFilters(allLeads, initialSubStatus = "SubStatus") {
  const [filterSubStatus, setFilterSubStatus] = useState(initialSubStatus);
  const leads = useMemo(() => {
    const uniqueLeads = deduplicateLeads(allLeads);
    if (filterSubStatus === "SubStatus") return uniqueLeads;
    return uniqueLeads.filter((lead) => lead.sub_status === filterSubStatus);
  }, [allLeads, filterSubStatus]);

  return { leads, filterSubStatus, setFilterSubStatus };
}
