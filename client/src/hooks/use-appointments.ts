import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function useAppointments() {
  return useQuery({
    queryKey: [api.appointments.list.path],
    queryFn: async () => {
      const res = await fetch(api.appointments.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return api.appointments.list.responses[200].parse(await res.json());
    },
    refetchInterval: 10_000,   // poll every 10s as safety net for missed WS events
    staleTime: 8_000,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.appointments.create.input>) => {
      const res = await fetch(api.appointments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Session expired. Please log in again.");
        const ct = res.headers.get("content-type");
        if (ct?.includes("application/json")) {
          const err = await res.json();
          throw new Error(err.message || "Failed to create appointment");
        }
        throw new Error(`Booking failed (${res.status})`);
      }
      return api.appointments.create.responses[201].parse(await res.json());
    },
    onSuccess: (appt: any) => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path], refetchType: "all" });
      if (appt?.doctorId) {
        queryClient.invalidateQueries({ queryKey: ["/api/doctors", appt.doctorId, "booked-slots"], refetchType: "all" } as any);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/dashboard"], refetchType: "all" } as any);
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/appointments"], refetchType: "all" } as any);
      toast({ title: "Appointment booked!" });
    },
    onError: (error: Error) => {
      toast({ title: "Booking Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled" }) => {
      const url = buildUrl(api.appointments.updateStatus.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");
      return api.appointments.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: (appt: any, { status }) => {
      queryClient.invalidateQueries({
        queryKey: [api.appointments.list.path],
        refetchType: "all",
      });
      // When completed or cancelled → free up the slot immediately
      if (["completed", "cancelled", "rejected"].includes(status) && appt?.doctorId) {
        queryClient.invalidateQueries({ queryKey: ["/api/doctors", appt.doctorId, "booked-slots"], refetchType: "all" } as any);
      }
      // Always refresh hospital dashboard stats too
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/dashboard"], refetchType: "all" } as any);
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/appointments"], refetchType: "all" } as any);
      toast({ title: "Status updated", description: `Appointment marked as ${status}` });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });
}
