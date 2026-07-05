import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function usePrescriptions() {
  return useQuery({
    queryKey: [api.prescriptions.list.path],
    queryFn: async () => {
      const res = await fetch(api.prescriptions.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch prescriptions");
      return res.json();
    },
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.prescriptions.create.input>) => {
      const res = await fetch(api.prescriptions.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const err = await res.json();
          throw new Error(err.message || "Failed to create prescription");
        }
        throw new Error(`Failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.prescriptions.list.path], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path], refetchType: "all" });
      toast({ title: "Prescription saved", description: "The prescription has been recorded." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });
}
