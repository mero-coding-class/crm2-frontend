import { useCallback, useState } from "react";
import { clientService } from "../../services/api";

export default function useAcademicUsers(authToken, enabled = true) {
  const [academicUsers, setAcademicUsers] = useState([]);
  const [error, setError] = useState("");

  const fetchAcademicUsers = useCallback(async () => {
    if (!authToken || !enabled) return;
    try {
      const data = await clientService.getAcademicAssignees(authToken);
      const list = Array.isArray(data) ? data : [];
      const normalized = (list || [])
        .map((user) => ({
          id: user.id,
          name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "",
        }))
        .filter((user) => user.id != null);
      setAcademicUsers(normalized);
      setError("");
    } catch (error) {
      setAcademicUsers([]);
      setError(error.message || "Could not load academic users.");
    }
  }, [authToken, enabled]);

  return { academicUsers, fetchAcademicUsers, error };
}
