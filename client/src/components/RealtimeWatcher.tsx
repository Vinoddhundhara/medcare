import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function RealtimeWatcher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("[WS Client] Connected to real-time updates");
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[WS Client] Received event:", data);
          if (data.type === "APPOINTMENT_UPDATED" || data.type === "AVAILABILITY_UPDATED") {
            // Invalidate appointments list
            queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
            // Invalidate doctors list
            queryClient.invalidateQueries({ queryKey: [api.doctors.list.path] });

            if (data.payload?.doctorId) {
              const doctorId = data.payload.doctorId;
              // Invalidate specific doctor queries
              queryClient.invalidateQueries({ queryKey: [api.doctors.get.path, doctorId] });
              queryClient.invalidateQueries({ queryKey: [buildUrl(api.doctors.get.path, { id: doctorId })] });
              // Invalidate booked slots query
              queryClient.invalidateQueries({ queryKey: ["/api/doctors", doctorId, "booked-slots"] });
            }
          }
        } catch (err) {
          console.error("[WS Client] Error parsing message:", err);
        }
      };

      socket.onclose = () => {
        console.log("[WS Client] Disconnected, attempting reconnect in 3s...");
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error("[WS Client] Socket error:", err);
        socket?.close();
      };
    }

    connect();

    return () => {
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [queryClient]);

  return null;
}
