import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type DoctorSearchParams = z.infer<typeof api.doctors.list.input>;

export function useDoctors(params?: DoctorSearchParams) {
  // Create a stable query key based on params
  const queryKey = [api.doctors.list.path, params];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Build query string
      const url = new URL(api.doctors.list.path, window.location.origin);
      if (params) {
        if (params.search) url.searchParams.set("search", params.search);
        if (params.specialization) url.searchParams.set("specialization", params.specialization);
        if (params.hospitalId) url.searchParams.set("hospitalId", params.hospitalId);
      }

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return api.doctors.list.responses[200].parse(await res.json());
    },
  });
}

export function useDoctor(id: number) {
  return useQuery({
    queryKey: [api.doctors.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.doctors.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doctor details");
      return api.doctors.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useBookedSlots(doctorId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ["/api/doctors", doctorId, "booked-slots"],
    queryFn: async () => {
      const res = await fetch(`/api/doctors/${doctorId}/booked-slots`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch booked slots");
      const data = await res.json();
      return data as { bookedSlots: string[]; structuredAvailability: any[] };
    },
    enabled: !!doctorId && enabled,
    refetchInterval: 8_000,   // keep slots fresh — red/available updates quickly
    staleTime: 6_000,
  });
}

// Doctor manages their own availability
export function useDoctorOwnAvailability() {
  return useQuery({
    queryKey: ["/api/doctor/availability"],
    queryFn: async () => {
      const res = await fetch("/api/doctor/availability", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
    refetchInterval: 30_000,
  });
}

export function useSaveDoctorOwnAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slots: any[]) => {
      const res = await fetch("/api/doctor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(slots),
      });
      if (!res.ok) throw new Error("Failed to save availability");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/doctor/availability"] });
    },
  });
}
