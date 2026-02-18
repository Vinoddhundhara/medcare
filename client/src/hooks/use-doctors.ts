import { useQuery } from "@tanstack/react-query";
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

      const res = await fetch(url.toString());
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
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch doctor details");
      return api.doctors.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}
