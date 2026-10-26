import { useCallback, useState } from "react";
import { clientService } from "../../services/api";

export default function useTeachers(authToken, enabled = true) {
  const [teachers, setTeachers] = useState([]);

  const fetchTeachers = useCallback(async () => {
    if (!authToken || !enabled) return;
    try {
      const data = await clientService.getAcademicAssignees(authToken);
      const list = Array.isArray(data) ? data : [];
      const normalized = (list || [])
        .map((t) => ({
          id: t.id,
          name: [t.first_name, t.last_name].filter(Boolean).join(" ") || t.username || "",
        }))
        .filter((t) => t.id != null);
      setTeachers(normalized);
    } catch (error) {
      console.warn("Failed loading academic users", error);
    }
  }, [authToken, enabled]);

  return { teachers, fetchTeachers };
}
