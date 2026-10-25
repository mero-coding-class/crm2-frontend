import { useCallback, useState } from "react";
import { BASE_URL } from "../../config";
import { apiFetch } from "../../services/api";

export default function useTeachers(authToken, enabled = true) {
  const [teachers, setTeachers] = useState([]);

  const fetchTeachers = useCallback(async () => {
    if (!authToken || !enabled) return;
    try {
      const res = await apiFetch(`${BASE_URL}/users/`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
      const data = await res.json();
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (data && Array.isArray(data.results)) list = data.results;
      else if (data && Array.isArray(data.data)) list = data.data;
      const normalized = (list || [])
        .filter((user) => user?.role === "academic" && user?.is_active !== false)
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
