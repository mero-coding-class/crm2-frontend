import { useEffect, useState } from "react";
import { BASE_URL } from "../../config";

export default function useUsers(authToken, enabled = true) {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!authToken || !enabled) {
      setUsers([]);
      setUsersLoading(false);
      return undefined;
    }
    let cancelled = false;
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/users/`, {
          headers: { Authorization: `Token ${authToken}` },
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        const normalized = (list || []).map((u) => ({
          id: u?.id ?? null,
          username: u?.username ?? (u?.email ? u.email.split("@")[0] : null),
          name: u?.name ?? u?.username ?? u?.email ?? String(u?.id ?? ""),
          email: u?.email ?? "",
          raw: u,
        }));
        if (!cancelled) setUsers(normalized);
      } catch (err) {
        console.error("Error fetching users", err);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };
    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [authToken, enabled]);

  return { users, usersLoading };
}
