import { useEffect, useRef } from "react";

export default function useRealtimeRefresh(authToken, refresh) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!authToken) return undefined;

    let timer;
    let pending = false;
    const runRefresh = () => {
      pending = false;
      refreshRef.current?.();
    };
    const scheduleRefresh = () => {
      if (document.visibilityState !== "visible") {
        pending = true;
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(runRefresh, 120);
    };
    const refreshWhenVisible = () => {
      if (pending && document.visibilityState === "visible") scheduleRefresh();
    };

    window.addEventListener("crm:remoteChange", scheduleRefresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("crm:remoteChange", scheduleRefresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [authToken]);
}
