import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface HospitalUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  state: string;
  country?: string;
  zipcode?: string;
  status: string;
  logo?: string;
  hospitalImage?: string;
  imageUrl?: string;
  description?: string;
  website?: string;
  emergencyNumber?: string;
  ambulanceAvailable: boolean;
  parkingAvailable: boolean;
  icuAvailable: boolean;
  bedCount: number;
  openingTime: string;
  closingTime: string;
  sessionExpiresAt?: number;
}

async function apiRequest(method: string, path: string, body?: any) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

export function useHospitalAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: hospital, isLoading } = useQuery<HospitalUser | null>({
    queryKey: ["/api/hospital/me"],
    queryFn: async () => {
      const res = await fetch("/api/hospital/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiRequest("POST", "/api/hospital/login", data),
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/hospital/me"], data.hospital);
      setLocation("/hospital/dashboard");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hospital/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["/api/hospital/me"], null);
      queryClient.clear();
      setLocation("/hospital/login");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/hospital/register", data),
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/hospital/me"], data);
      setLocation("/hospital/dashboard");
    },
  });

  return {
    hospital,
    isLoading,
    isAuthenticated: !!hospital,
    login: loginMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error,
    logout: logoutMutation.mutate,
    register: registerMutation.mutateAsync,
    registerPending: registerMutation.isPending,
    registerError: registerMutation.error,
  };
}
