/**
 * Hook for fetching nearby hospitals directly from Overpass API (client-side).
 * No backend proxy needed — Overpass supports CORS.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchNearbyHospitals } from "@/lib/overpass";

export type { NearbyHospital } from "@/lib/overpass";

interface UseNearbyHospitalsOptions {
  lat: number | null;
  lng: number | null;
  radius: number; // km
  enabled: boolean;
}

export function useNearbyHospitals({ lat, lng, radius, enabled }: UseNearbyHospitalsOptions) {
  return useQuery({
    queryKey: ["nearby-hospitals", lat, lng, radius],
    queryFn: async ({ signal }) => {
      if (lat === null || lng === null) throw new Error("Location not available");
      return fetchNearbyHospitals(lat, lng, radius, signal);
    },
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
