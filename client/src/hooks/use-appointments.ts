import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function useAppointments() {
  return useQuery({
    queryKey: [api.appointments.list.path],
    queryFn: async () => {
      const res = await fetch(api.appointments.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return api.appointments.list.responses[200].parse(await res.json());
    },
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
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const error = await res.json();
          throw new Error(error.message || "Failed to create appointment");
        }
        throw new Error(`Booking failed (${res.status})`);
      }
      return api.appointments.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.appointments.list.path],
        refetchType: "all",
      });
      toast({ title: "Success", description: "Appointment booked successfully!" });
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
    onSuccess: (_, variables) => {
      // refetchType: 'all' ensures Dashboard and Analytics also update
      // even if they are not the currently active page
      queryClient.invalidateQueries({
        queryKey: [api.appointments.list.path],
        refetchType: "all",
      });
      toast({ title: "Status Updated", description: `Appointment marked as ${variables.status}` });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });
}
