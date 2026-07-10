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
import { Checkbox } from "@/components/ui/checkbox";
import {
  User, Mail, Phone, Calendar, Stethoscope, Building2,
  Clock, DollarSign, Edit3, Save, X, Activity, FileText,
  Video, Globe, Users, GraduationCap, Plus, Trash2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    qualification: profile?.qualification || "",
    onlineFee: profile?.onlineFee?.toString() || "",
    offlineFee: profile?.offlineFee?.toString() || "",
    videoFee: profile?.videoFee?.toString() || "",
    onlineEnabled: profile?.onlineEnabled ?? true,
    offlineEnabled: profile?.offlineEnabled ?? true,
    videoEnabled: profile?.videoEnabled ?? false,
  });

  const [availabilityList, setAvailabilityList] = useState<{ day: string; start: string; end: string }[]>(() => {
    return (profile?.availability || []).map((s: string) => {
      const parts = s.trim().split(" ");
      const day = parts[0] || "Monday";
      const timeRange = parts[1] || "09:00-17:00";
      const [start, end] = timeRange.split("-");
      return { day, start: start || "09:00", end: end || "17:00" };
    });
  });

  const handleSave = () => {
    const availabilityArr = availabilityList.map(a => `${a.day} ${a.start}-${a.end}`);
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
                    <Label>Specialization</Label>
                    <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Qualification</Label>
                    <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g., MBBS, MD" />
                  </div>
                  <div className="space-y-1">
                    <Label>Experience (years)</Label>
                    <Input type="number" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Base Consultation Fee ($)</Label>
                    <Input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-base font-semibold">Consultation Types</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Online */}
                    <div className="flex flex-col space-y-2 p-3 border rounded-lg bg-card shadow-sm">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="online" checked={form.onlineEnabled} onCheckedChange={(c) => setForm({ ...form, onlineEnabled: !!c })} />
                        <Label htmlFor="online" className="flex items-center gap-1 cursor-pointer"><Globe className="w-4 h-4" /> Online</Label>
                      </div>
                      <div className="pl-6">
                        <Label className="text-xs text-muted-foreground">Fee ($)</Label>
                        <Input type="number" value={form.onlineFee} onChange={(e) => setForm({ ...form, onlineFee: e.target.value })} disabled={!form.onlineEnabled} className="mt-1 h-8 text-sm" />
                      </div>
                    </div>
                    {/* Offline */}
                    <div className="flex flex-col space-y-2 p-3 border rounded-lg bg-card shadow-sm">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="offline" checked={form.offlineEnabled} onCheckedChange={(c) => setForm({ ...form, offlineEnabled: !!c })} />
                        <Label htmlFor="offline" className="flex items-center gap-1 cursor-pointer"><Users className="w-4 h-4" /> Offline (In-Clinic)</Label>
                      </div>
                      <div className="pl-6">
                        <Label className="text-xs text-muted-foreground">Fee ($)</Label>
                        <Input type="number" value={form.offlineFee} onChange={(e) => setForm({ ...form, offlineFee: e.target.value })} disabled={!form.offlineEnabled} className="mt-1 h-8 text-sm" />
                      </div>
                    </div>
                    {/* Video */}
                    <div className="flex flex-col space-y-2 p-3 border rounded-lg bg-card shadow-sm">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="video" checked={form.videoEnabled} onCheckedChange={(c) => setForm({ ...form, videoEnabled: !!c })} />
                        <Label htmlFor="video" className="flex items-center gap-1 cursor-pointer"><Video className="w-4 h-4" /> Video Call</Label>
                      </div>
                      <div className="pl-6">
                        <Label className="text-xs text-muted-foreground">Fee ($)</Label>
                        <Input type="number" value={form.videoFee} onChange={(e) => setForm({ ...form, videoFee: e.target.value })} disabled={!form.videoEnabled} className="mt-1 h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Weekly Schedule</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setAvailabilityList([...availabilityList, { day: "Monday", start: "09:00", end: "17:00" }])}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Slot
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {availabilityList.map((slot, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-center bg-muted/30 p-2 rounded-lg border">
                        <Select 
                          value={slot.day} 
                          onValueChange={(val) => {
                            const newList = [...availabilityList];
                            newList[idx].day = val;
                            setAvailabilityList(newList);
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-[140px] h-9">
                            <SelectValue placeholder="Select Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                              <SelectItem key={day} value={day}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <div className="flex items-center gap-2 flex-1">
                          <Input 
                            type="time" 
                            className="h-9 flex-1" 
                            value={slot.start}
                            onChange={(e) => {
                              const newList = [...availabilityList];
                              newList[idx].start = e.target.value;
                              setAvailabilityList(newList);
                            }}
                          />
                          <span className="text-xs text-muted-foreground font-medium">to</span>
                          <Input 
                            type="time" 
                            className="h-9 flex-1" 
                            value={slot.end}
                            onChange={(e) => {
                              const newList = [...availabilityList];
                              newList[idx].end = e.target.value;
                              setAvailabilityList(newList);
                            }}
                          />
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                          onClick={() => {
                            const newList = [...availabilityList];
                            newList.splice(idx, 1);
                            setAvailabilityList(newList);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {availabilityList.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                        No availability slots added.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <InfoRow icon={Mail} label="Email" value={user.email} />
                <InfoRow icon={Stethoscope} label="Specialization" value={profile?.specialization} />
                <InfoRow icon={GraduationCap} label="Qualification" value={profile?.qualification} />
                <InfoRow icon={Activity} label="Experience" value={profile?.experience ? `${profile.experience} years` : ""} />
                <InfoRow icon={DollarSign} label="Base Consultation Fee" value={profile?.consultationFee ? `$${profile.consultationFee}` : ""} />
                
                {profile?.availability && profile.availability.length > 0 && (
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground mb-2 block">Weekly Schedule</Label>
                    <div className="space-y-2">
                      {profile.availability.map((time: string, i: number) => {
                        const [day, ...rest] = time.split(" ");
                        return (
                          <div key={i} className="flex justify-between items-center text-sm p-2 bg-muted/40 rounded-md">
                            <span className="font-medium text-primary">{day}</span>
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {rest.join(" ")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="py-3 px-1">
                  <p className="text-xs text-muted-foreground mb-2">Available Consultation Types</p>
                  <div className="flex flex-wrap gap-2">
                    {profile?.onlineEnabled && (
                      <Badge variant="outline" className="flex items-center gap-1 bg-blue-500/10 text-blue-600 border-blue-200">
                        <Globe className="w-3 h-3" /> Online {profile?.onlineFee ? `($${profile.onlineFee})` : ""}
                      </Badge>
                    )}
                    {profile?.offlineEnabled && (
                      <Badge variant="outline" className="flex items-center gap-1 bg-green-500/10 text-green-600 border-green-200">
                        <Users className="w-3 h-3" /> Offline {profile?.offlineFee ? `($${profile.offlineFee})` : ""}
                      </Badge>
                    )}
                    {profile?.videoEnabled && (
                      <Badge variant="outline" className="flex items-center gap-1 bg-purple-500/10 text-purple-600 border-purple-200">
                        <Video className="w-3 h-3" /> Video {profile?.videoFee ? `($${profile.videoFee})` : ""}
                      </Badge>
                    )}
                    {!profile?.onlineEnabled && !profile?.offlineEnabled && !profile?.videoEnabled && (
                      <span className="text-sm text-muted-foreground italic">None selected</span>
                    )}
                  </div>
                </div>

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
