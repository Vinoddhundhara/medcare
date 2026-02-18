import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useHospitals() {
  return useQuery({
    queryKey: [api.hospitals.list.path],
    queryFn: async () => {
      const res = await fetch(api.hospitals.list.path);
      if (!res.ok) throw new Error("Failed to fetch hospitals");
      return api.hospitals.list.responses[200].parse(await res.json());
    },
  });
}
