import { useCallback, useState } from "react";
import { userService } from "../../services/api";

export default function useTeachers(authToken) {
  const [teachers, setTeachers] = useState([]);

  const fetchTeachers = useCallback(async () => {
    try {
      // Backend has no /teachers/ route — teachers are users with role=academic.
      // Non-admins cannot list users (403); fall back to empty in that case.
      const list = await userService.list(authToken).catch(() => []);
      const academics = (list || []).filter(
        (u) => (u.role || "").toLowerCase() === "academic"
      );
      const normalized = academics
        .map((t) => ({
          id: t.id,
          name:
            [t.first_name, t.last_name].filter(Boolean).join(" ").trim() ||
            t.username ||
            t.email ||
            String(t.id ?? ""),
          raw: t,
        }))
        .filter((t) => t.id != null);
      setTeachers(normalized);
    } catch (e) {
      console.warn("Failed loading teachers", e);
    }
  }, [authToken]);

  return { teachers, fetchTeachers };
}
