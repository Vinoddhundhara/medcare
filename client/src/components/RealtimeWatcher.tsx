import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function RealtimeWatcher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function invalidateAll(payload?: any) {
      // ── Patient & Doctor side — force refetch immediately ──
      queryClient.invalidateQueries({
        queryKey: [api.appointments.list.path],
        refetchType: "all",
      });
      queryClient.invalidateQueries({ queryKey: [api.doctors.list.path] });

      if (payload?.doctorId) {
        const id = payload.doctorId;
        queryClient.invalidateQueries({ queryKey: [api.doctors.get.path, id] });
        queryClient.invalidateQueries({ queryKey: [buildUrl(api.doctors.get.path, { id })] });
        queryClient.invalidateQueries({ queryKey: ["/api/doctors", id, "booked-slots"], refetchType: "all" } as any);
        queryClient.invalidateQueries({ queryKey: ["/api/doctor/availability"], refetchType: "all" } as any);
      }

      // ── Hospital panel — always invalidate regardless of hospitalId ──
      // hospitalId may be null on older appointments, so we always refresh hospital data
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/dashboard"], refetchType: "all" } as any);
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/appointments"], refetchType: "all" } as any);
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/notifications"], refetchType: "all" } as any);
      if (payload?.hospitalId) {
        queryClient.invalidateQueries({ queryKey: ["/api/hospital/patients"], refetchType: "all" } as any);
      }
    }

    function connect() {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("[WS] Connected");
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "APPOINTMENT_CREATED":
            case "APPOINTMENT_UPDATED":
              invalidateAll(data.payload);
              break;

            case "AVAILABILITY_UPDATED":
              queryClient.invalidateQueries({ queryKey: [api.appointments.list.path], refetchType: "all" } as any);
              if (data.payload?.doctorId) {
                const id = data.payload.doctorId;
                queryClient.invalidateQueries({ queryKey: ["/api/doctors", id, "booked-slots"], refetchType: "all" } as any);
                queryClient.invalidateQueries({ queryKey: ["/api/doctor/availability"], refetchType: "all" } as any);
              }
              queryClient.invalidateQueries({ queryKey: ["/api/hospital/dashboard"], refetchType: "all" } as any);
              break;

            case "DOCTOR_ADDED":
            case "DOCTOR_UPDATED":
              queryClient.invalidateQueries({ queryKey: ["/api/hospital/doctors"] });
              queryClient.invalidateQueries({ queryKey: ["/api/hospital/dashboard"] });
              queryClient.invalidateQueries({ queryKey: [api.doctors.list.path] });
              break;

            default:
              break;
          }
        } catch (err) {
          console.error("[WS] Parse error:", err);
        }
      };

      socket.onclose = () => {
        console.log("[WS] Disconnected, reconnecting in 3s…");
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = () => socket?.close();
    }

    connect();

    return () => {
      if (socket) { socket.onclose = null; socket.onerror = null; socket.close(); }
      clearTimeout(reconnectTimeout);
    };
  }, [queryClient]);

  return null;
}
