import { useEffect, useState } from "react";
import { classService } from "../../services/api";

export default function useClasses(authToken) {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authToken) return undefined;
    let cancelled = false;
    classService.getClasses(authToken)
      .then((items) => {
        if (cancelled) return;
        setClasses(items);
        setError("");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setClasses([]);
        setError(requestError.message || "Could not load the Class Catalog.");
      });
    return () => { cancelled = true; };
  }, [authToken]);

  return { classes, error };
}
