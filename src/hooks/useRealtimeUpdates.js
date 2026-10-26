import { useEffect } from "react";
import { WEBSOCKET_ORIGIN } from "../config.js";

const CHANGE_EVENT = "crm:remoteChange";

function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export default function useRealtimeUpdates(authToken) {
  useEffect(() => {
    if (!authToken) return undefined;

    let stopped = false;
    let hasConnected = false;
    let reconnectDelay = 1000;
    let reconnectTimer;
    let heartbeatTimer;
    let socket;

    const connect = () => {
      if (stopped) return;

      const url = new URL("/ws/updates/", WEBSOCKET_ORIGIN || window.location.origin);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(url);

      socket.onopen = () => {
        reconnectDelay = 1000;
        if (hasConnected) notifyDataChanged();
        hasConnected = true;
        heartbeatTimer = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "data_changed") notifyDataChanged();
        } catch {
          // Ignore malformed frames and keep the live connection open.
        }
      };

      socket.onerror = () => socket?.close();
      socket.onclose = (event) => {
        window.clearInterval(heartbeatTimer);
        if (event.code === 4401) {
          window.dispatchEvent(new CustomEvent("crm:authExpired"));
          return;
        }
        if (stopped) return;
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(reconnectTimer);
      window.clearInterval(heartbeatTimer);
      socket?.close();
    };
  }, [authToken]);
}
