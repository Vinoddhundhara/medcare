import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Mail, Phone, Calendar, Stethoscope, Building2,
  Clock, DollarSign, Edit3, Save, X, Activity, FileText,
} from "lucide-react";

// ─── API hooks ────────────────────────────────────────────────────────────────

function useProfile() {
  return useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });
}

function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Update failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/profile"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });
}

// ─── Shared components ────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="p-2 bg-muted rounded-lg shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Patient Profile ──────────────────────────────────────────────────────────

function PatientProfile({ user, profile }: any) {
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    contact: profile?.contact || "",
    age: profile?.age?.toString() || "",
    gender: profile?.gender || "",
    medicalHistory: profile?.medicalHistory || "",
  });

  const handleSave = () => {
    updateProfile(form, { onSuccess: () => setEditing(false) });
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 to-blue-400/20" />
        <CardContent className="pt-0 -mt-12 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-center sm:text-left pb-1">
                <h3 className="text-xl font-bold">{user.name}</h3>
                <Badge variant="secondary" className="capitalize mt-1">{user.role}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isPending}>
                    <Save className="w-4 h-4 mr-1" /> {isPending ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit3 className="w-4 h-4 mr-1" /> Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Contact</Label>
                <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Age</Label>
                <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Gender</Label>
                <Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Medical History</Label>
                <Textarea
                  rows={3}
                  value={form.medicalHistory}
                  onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
                  placeholder="Any known conditions, allergies, past surgeries..."
                />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              <InfoRow icon={User} label="Full Name" value={user.name} />
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow icon={Phone} label="Contact" value={profile?.contact} />
              <InfoRow icon={Calendar} label="Age" value={profile?.age ? `${profile.age} years` : ""} />
              <InfoRow icon={User} label="Gender" value={profile?.gender} />
              {profile?.medicalHistory && (
                <InfoRow icon={FileText} label="Medical History" value={profile.medicalHistory} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Doctor Profile ───────────────────────────────────────────────────────────

function DoctorProfile({ user, profile }: any) {
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    specialization: profile?.specialization || "",
    experience: profile?.experience?.toString() || "",
    consultationFee: profile?.consultationFee?.toString() || "",
    availability: (profile?.availability || []).join(", "),
  });

  const handleSave = () => {
    const availabilityArr = form.availability
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    updateProfile(
      { ...form, availability: availabilityArr },
      { onSuccess: () => setEditing(false) }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-emerald-500/20 to-teal-400/20" />
        <CardContent className="pt-0 -mt-12 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-center sm:text-left pb-1">
                <h3 className="text-xl font-bold">Dr. {user.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center sm:justify-start">
                  <Stethoscope className="w-3 h-3" /> {profile?.specialization}
                </p>
                {profile?.hospital && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center sm:justify-start mt-0.5">
                    <Building2 className="w-3 h-3" /> {profile.hospital.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isPending}>
                    <Save className="w-4 h-4 mr-1" /> {isPending ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit3 className="w-4 h-4 mr-1" /> Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Professional info */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Professional Details</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Full Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Specialization</Label>
                    <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Experience (years)</Label>
                    <Input type="number" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label>Consultation Fee ($)</Label>
                    <Input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Availability (comma-separated)</Label>
                  <Textarea
                    rows={2}
                    value={form.availability}
                    onChange={(e) => setForm({ ...form, availability: e.target.value })}
                    placeholder="Mon 09:00-17:00, Wed 09:00-17:00"
                  />
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <InfoRow icon={Mail} label="Email" value={user.email} />
                <InfoRow icon={Stethoscope} label="Specialization" value={profile?.specialization} />
                <InfoRow icon={Activity} label="Experience" value={profile?.experience ? `${profile.experience} years` : ""} />
                <InfoRow icon={DollarSign} label="Consultation Fee" value={profile?.consultationFee ? `$${profile.consultationFee}` : ""} />
                {profile?.hospital && (
                  <InfoRow icon={Building2} label="Hospital" value={`${profile.hospital.name} · ${profile.hospital.location}`} />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Availability Schedule</CardTitle>
            <CardDescription>Your weekly working hours</CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.availability && profile.availability.length > 0 ? (
              <div className="space-y-2">
                {profile.availability.map((slot: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{slot}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No availability set.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuth();
  const { data, isLoading } = useProfile();

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h2 className="text-3xl font-display font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground mt-1">
          View and manage your personal information.
        </p>
      </div>

      {user.role === "patient" ? (
        <PatientProfile user={data?.user || user} profile={data?.profile} />
      ) : user.role === "doctor" ? (
        <DoctorProfile user={data?.user || user} profile={data?.profile} />
      ) : (
        <Card className="border-border/60 p-8 text-center text-muted-foreground">
          Admin profile coming soon.
        </Card>
      )}
    </div>
  );
}
