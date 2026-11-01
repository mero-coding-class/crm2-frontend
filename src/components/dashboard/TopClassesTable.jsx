import React, { useEffect, useState } from "react";
import { BASE_URL } from "../../config";

const TopClassesTable = ({
  classes = [],
  classesMap: propClassesMap = null,
  authToken = null,
}) => {
  const [localMap, setLocalMap] = useState(propClassesMap || {});

  useEffect(() => {
    // prefer parent-provided coursesMap if available
    if (propClassesMap && Object.keys(propClassesMap).length > 0) {
      setLocalMap(propClassesMap);
      return;
    }

    if (!authToken) return;
    let mounted = true;
    const fetchCatalogClasses = async () => {
      try {
        // Use /api/catalogs/classes/ — the real endpoint in crm2-backend
        const res = await fetch(`${BASE_URL}/catalogs/classes/?active=true`, {
          headers: { Authorization: `Token ${authToken}` },
        });
        if (!res.ok || !mounted) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.results || [];
        const map = {};
        list.forEach((c) => {
          const id = c.id ?? c.pk ?? null;
          const name = c.class_name || c.name || c.title || "";
          if (id != null) map[String(id)] = name;
          if (name) map[String(name).toLowerCase()] = name;
        });
        if (mounted && Object.keys(map).length > 0) setLocalMap(map);
      } catch (err) {
        console.warn("TopClassesTable: failed to fetch Class Catalog:", err);
      }
    };
    fetchCatalogClasses();
    return () => { mounted = false; };
  }, [propClassesMap, authToken]);
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Top Classes by Enrollment
      </h3>

      {classes.length === 0 ? (
        <p className="text-slate-500 text-center py-4">No top classes data.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Class Name
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Enrollments
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-slate-200">
              {classes.map((classItem, index) => {
                // Accept the catalog's class_name or its API name field.
                const rawName =
                  classItem.class_name ?? classItem.name ?? classItem.id ?? null;
                const providedName = classItem.class_name || null;
                // If dashboard already provided a readable name, prefer it.
                // Only attempt lookups when rawName looks like an id or when a mapping exists.
                let resolved = "Unknown Class";
                if (rawName == null) {
                  resolved = "Unknown Class";
                } else if (
                  typeof rawName === "string" &&
                  rawName.trim() !== ""
                ) {
                  // if it's purely numeric (id), look up in map
                  if (/^\d+$/.test(rawName)) {
                    resolved = localMap[String(rawName)] || `Class ${rawName}`;
                  } else {
                    // prefer showing the provided name (already human-readable)
                    // but fall back to map lookups to correct casing or alternate names
                    resolved =
                      providedName ||
                      rawName ||
                      localMap[String(rawName)] ||
                      localMap[String(rawName).toLowerCase()] ||
                      `Class ${rawName}`;
                  }
                } else {
                  // non-string (number), try mapping
                  resolved = localMap[String(rawName)] || String(rawName);
                }
                return (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {resolved}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-700">
                      {classItem.enrollments}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TopClassesTable;
