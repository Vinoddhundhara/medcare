import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

// ── Dashboard ──────────────────────────────────────────────────
export function useHospitalDashboard() {
  return useQuery({
    queryKey: ["/api/hospital/dashboard"],
    queryFn: () => apiFetch("/api/hospital/dashboard"),
    refetchInterval: 10_000,  // poll every 10s + WS invalidation
    staleTime: 8_000,
  });
}

// ── Departments ────────────────────────────────────────────────
export function useHospitalDepartments() {
  return useQuery({
    queryKey: ["/api/hospital/departments"],
    queryFn: () => apiFetch("/api/hospital/departments"),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiFetch("/api/hospital/departments", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/departments"] });
      toast({ title: "Department created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiFetch(`/api/hospital/departments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/departments"] });
      toast({ title: "Department updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/hospital/departments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/departments"] });
      toast({ title: "Department deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Doctors ────────────────────────────────────────────────────
export function useHospitalDoctors(filters?: { search?: string; departmentId?: number; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.departmentId) params.set("departmentId", String(filters.departmentId));
  if (filters?.status) params.set("status", filters.status);
  return useQuery({
    queryKey: ["/api/hospital/doctors", filters],
    queryFn: () => apiFetch(`/api/hospital/doctors?${params}`),
  });
}

export function useAddHospitalDoctor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/api/hospital/doctors", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/doctors"] });
      qc.invalidateQueries({ queryKey: ["/api/hospital/dashboard"] });
      toast({ title: "Doctor added successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateHospitalDoctor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiFetch(`/api/hospital/doctors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/doctors"] });
      toast({ title: "Doctor updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useToggleDoctorStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/hospital/doctors/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/doctors"] });
      toast({ title: "Doctor status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteHospitalDoctor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/hospital/doctors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/doctors"] });
      toast({ title: "Doctor deactivated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDoctorAvailability(doctorId: number | null) {
  return useQuery({
    queryKey: ["/api/hospital/doctors", doctorId, "availability"],
    queryFn: () => apiFetch(`/api/hospital/doctors/${doctorId}/availability`),
    enabled: !!doctorId,
  });
}

export function useSaveDoctorAvailability() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ doctorId, slots }: { doctorId: number; slots: any[] }) =>
      apiFetch(`/api/hospital/doctors/${doctorId}/availability`, { method: "POST", body: JSON.stringify(slots) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/doctors", vars.doctorId, "availability"] });
      toast({ title: "Availability saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Appointments ───────────────────────────────────────────────
export function useHospitalAppointments(filters?: { status?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  return useQuery({
    queryKey: ["/api/hospital/appointments", filters],
    queryFn: () => apiFetch(`/api/hospital/appointments?${params}`),
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
}

export function useUpdateHospitalAppointmentStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/hospital/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/appointments"] });
      qc.invalidateQueries({ queryKey: ["/api/hospital/dashboard"] });
      toast({ title: "Appointment updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useAssignDoctor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ appointmentId, doctorId }: { appointmentId: number; doctorId: number }) =>
      apiFetch(`/api/hospital/appointments/${appointmentId}/assign-doctor`, { method: "PATCH", body: JSON.stringify({ doctorId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/appointments"] });
      toast({ title: "Doctor assigned" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, date }: { id: number; date: string }) =>
      apiFetch(`/api/hospital/appointments/${id}/reschedule`, { method: "PATCH", body: JSON.stringify({ date }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/appointments"] });
      toast({ title: "Appointment rescheduled" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Patients ───────────────────────────────────────────────────
export function useHospitalPatients() {
  return useQuery({
    queryKey: ["/api/hospital/patients"],
    queryFn: () => apiFetch("/api/hospital/patients"),
  });
}

// ── Reviews ────────────────────────────────────────────────────
export function useHospitalReviews() {
  return useQuery({
    queryKey: ["/api/hospital/reviews"],
    queryFn: () => apiFetch("/api/hospital/reviews"),
  });
}

// ── Analytics ──────────────────────────────────────────────────
export function useHospitalAnalytics() {
  return useQuery({
    queryKey: ["/api/hospital/analytics"],
    queryFn: () => apiFetch("/api/hospital/analytics"),
    refetchInterval: 60_000,
  });
}

// ── Notifications ──────────────────────────────────────────────
export function useHospitalNotifications() {
  return useQuery({
    queryKey: ["/api/hospital/notifications"],
    queryFn: () => apiFetch("/api/hospital/notifications"),
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/hospital/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hospital/notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => apiFetch("/api/hospital/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hospital/notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });
}

// ── Hospital Profile Update ────────────────────────────────────
export function useUpdateHospitalProfile() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/api/hospital/profile", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (data) => {
      qc.setQueryData(["/api/hospital/me"], data);
      toast({ title: "Profile updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Public: hospital details for patients ──────────────────────
export function useHospitalDetails(id: number | null) {
  return useQuery({
    queryKey: ["/api/hospitals", id, "details"],
    queryFn: () => apiFetch(`/api/hospitals/${id}/details`),
    enabled: !!id,
  });
}

export function useHospitalDepartmentsPublic(hospitalId: number | null) {
  return useQuery({
    queryKey: ["/api/hospitals", hospitalId, "departments"],
    queryFn: () => apiFetch(`/api/hospitals/${hospitalId}/departments`),
    enabled: !!hospitalId,
  });
}

export function useHospitalDoctorsPublic(hospitalId: number | null, filters?: { departmentId?: number }) {
  const params = new URLSearchParams();
  if (filters?.departmentId) params.set("departmentId", String(filters.departmentId));
  return useQuery({
    queryKey: ["/api/hospitals", hospitalId, "doctors", filters],
    queryFn: () => apiFetch(`/api/hospitals/${hospitalId}/doctors?${params}`),
    enabled: !!hospitalId,
  });
}

export function useHospitalReviewsPublic(hospitalId: number | null) {
  return useQuery({
    queryKey: ["/api/hospitals", hospitalId, "reviews"],
    queryFn: () => apiFetch(`/api/hospitals/${hospitalId}/reviews`),
    enabled: !!hospitalId,
  });
}
