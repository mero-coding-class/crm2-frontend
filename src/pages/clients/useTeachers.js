import { useCallback, useState } from "react";
import { BASE_URL } from "../../config";

export default function useTeachers(authToken) {
  const [teachers, setTeachers] = useState([]);

  const fetchTeachers = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${BASE_URL}/teachers/`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch teachers");
      const data = await res.json();
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (data && Array.isArray(data.results)) list = data.results;
      else if (data && Array.isArray(data.data)) list = data.data;
      const normalized = (list || [])
        .map((t) => ({
          id: t.id || t.pk || t._id || t.teacher_id || t.uuid,
          name: t.name || t.teacher_name || t.full_name || t.title || "",
        }))
        .filter((t) => t.id != null);
      setTeachers(normalized);
    } catch (e) {
      console.warn("Failed loading teachers", e);
    }
  }, [authToken]);

  return { teachers, fetchTeachers };
}
