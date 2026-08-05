/**
 * Doctor Dashboard — hospital-panel style
 * Clean, useful tabs only. Doctors manage their own schedule here.
 */
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { useDoctorOwnAvailability, useSaveDoctorOwnAvailability } from "@/hooks/use-doctors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  Calendar, Users, DollarSign, Clock,
  CheckCircle, Activity, Loader2, Search,
  Check, X, Video, Link2, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <Card className="hover:shadow-lg transition-shadow border-border/60">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value ?? "—"}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Time Field ─────────────────────────────────────────────────────────────
function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input type="time" value={value} onChange={e => onChange(e.target.value)} className="h-8 text-sm mt-0.5" />
    </div>
  );
}

// ── Schedule Tab ───────────────────────────────────────────────────────────
function ScheduleTab() {
  const { data: avail, isLoading } = useDoctorOwnAvailability();
  const saveMut = useSaveDoctorOwnAvailability();
  const { toast } = useToast();

  const initSlots = () =>
    DAYS.map(day => ({
      dayOfWeek: day, isAvailable: false,
      startTime: "09:00", endTime: "17:00",
      breakStart: "13:00", breakEnd: "14:00",
      slotDuration: 30, emergencyAvailable: false, leaveDates: [],
    }));

  const [slots, setSlots] = useState<any[]>(initSlots);
  const [synced, setSynced] = useState(false);

  if (avail && !synced) {
    const merged = DAYS.map(day => {
      const s = avail.find((x: any) => x.dayOfWeek === day);
      return s
        ? { ...s, isAvailable: true }
        : { dayOfWeek: day, isAvailable: false, startTime: "09:00", endTime: "17:00", breakStart: "13:00", breakEnd: "14:00", slotDuration: 30, emergencyAvailable: false, leaveDates: [] };
    });
    setSlots(merged);
    setSynced(true);
  }

  const update = (idx: number, k: string, v: any) =>
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [k]: v } : s));

  const handleSave = async () => {
    await saveMut.mutateAsync(slots.filter(s => s.isAvailable));
    toast({ title: "Schedule saved", description: "Patients can now see your updated slots." });
  };

  if (isLoading) return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Weekly Schedule</h3>
          <p className="text-sm text-muted-foreground">Set days and hours when patients can book with you.</p>
        </div>
        <Button onClick={handleSave} disabled={saveMut.isPending}>
          {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Save Schedule
        </Button>
      </div>
      <div className="space-y-3">
        {slots.map((slot, i) => (
          <div
            key={slot.dayOfWeek}
            className={`rounded-xl border p-4 transition-colors ${
              slot.isAvailable
                ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800"
                : "border-border bg-muted/20"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={slot.isAvailable}
                  onChange={e => update(i, "isAvailable", e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="font-medium capitalize">{slot.dayOfWeek}</span>
              </label>
              {slot.isAvailable && (
                <label className="flex items-center gap-1.5 text-xs text-orange-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slot.emergencyAvailable}
                    onChange={e => update(i, "emergencyAvailable", e.target.checked)}
                    className="w-3.5 h-3.5 accent-orange-500"
                  />
                  Emergency
                </label>
              )}
            </div>
            {slot.isAvailable && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <TimeField label="Start" value={slot.startTime} onChange={v => update(i, "startTime", v)} />
                <TimeField label="End" value={slot.endTime} onChange={v => update(i, "endTime", v)} />
                <TimeField label="Break Start" value={slot.breakStart} onChange={v => update(i, "breakStart", v)} />
                <TimeField label="Break End" value={slot.breakEnd} onChange={v => update(i, "breakEnd", v)} />
                <div>
                  <label className="text-xs text-muted-foreground">Slot (min)</label>
                  <Input
                    type="number" min={10} max={120} step={5}
                    value={slot.slotDuration}
                    onChange={e => update(i, "slotDuration", parseInt(e.target.value))}
                    className="h-8 text-sm mt-0.5"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Video Link inline form ─────────────────────────────────────────────────
function VideoLinkForm({ appointmentId, existingLink }: { appointmentId: number; existingLink?: string }) {
  const [link, setLink] = useState(existingLink || "");
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const handleSave = async () => {
    try { new URL(link); } catch {
      toast({ title: "Invalid URL", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/video-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).message);
      qc.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({ title: "Video link saved" });
      setShow(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (!show) return (
    <Button size="sm" variant="outline" onClick={() => setShow(true)}
      className="h-7 text-xs text-violet-600 border-violet-200 hover:bg-violet-50">
      <Video className="w-3 h-3 mr-1" />
      {existingLink ? "Update Link" : "Add Video Link"}
    </Button>
  );

  return (
    <div className="flex gap-2 items-center mt-2">
      <Input
        value={link} onChange={e => setLink(e.target.value)}
        placeholder="https://meet.google.com/..." className="h-8 text-xs"
        autoFocus
      />
      <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs shrink-0">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setShow(false)} className="h-8 text-xs shrink-0">
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

// ── Appointment Row ────────────────────────────────────────────────────────
function AppointmentRow({ apt, showActions = false }: { apt: any; showActions?: boolean }) {
  const updateStatus = useUpdateAppointmentStatus();
  const act = (status: string) => updateStatus.mutate({ id: apt.id, status: status as any });

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-border/60 hover:border-primary/20 bg-card transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0
            ${apt.status === "confirmed" ? "bg-green-100 text-green-700 dark:bg-green-900/40" :
              apt.status === "pending"   ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40" :
              apt.status === "completed" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40" :
              "bg-gray-100 text-gray-600 dark:bg-gray-900/40"}`}>
            {format(new Date(apt.date), "d")}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{apt.patient?.user?.name || "Patient"}</p>
            <p className="text-sm text-muted-foreground">{format(new Date(apt.date), "EEE, MMM d • h:mm a")}</p>
            {apt.reason && <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{apt.reason}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={STATUS_COLORS[apt.status] || ""}>{apt.status}</Badge>
          {apt.consultationFee > 0 && (
            <span className="text-xs font-medium text-muted-foreground">₹{apt.consultationFee}</span>
          )}
          {showActions && apt.status === "pending" && (
            <>
              <Button size="sm" variant="outline" onClick={() => act("confirmed")}
                disabled={updateStatus.isPending}
                className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50">
                <Check className="w-3 h-3 mr-1" /> Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => act("rejected")}
                disabled={updateStatus.isPending}
                className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50">
                <X className="w-3 h-3 mr-1" /> Reject
              </Button>
            </>
          )}
          {showActions && apt.status === "confirmed" && (
            <Button size="sm" variant="outline" onClick={() => act("completed")}
              disabled={updateStatus.isPending}
              className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
              <CheckCircle className="w-3 h-3 mr-1" /> Complete
            </Button>
          )}
        </div>
      </div>

      {/* Video link section for confirmed appointments */}
      {apt.status === "confirmed" && (
        <div className="border-t border-border/40 pt-2 flex flex-wrap items-center gap-2">
          <VideoLinkForm appointmentId={apt.id} existingLink={apt.videoCallLink} />
          {apt.videoCallLink && (
            <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-violet-600 hover:underline truncate max-w-xs">
              <Link2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{apt.videoCallLink}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────
function Empty({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <Card>
      <CardContent className="py-14 flex flex-col items-center">
        <Icon className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="font-medium text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useAppointments();
  const [search, setSearch] = useState("");

  if (!user) return null;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);

  const all       = appointments || [];
  const today     = all.filter((a: any) => { const d = new Date(a.date); return d >= todayStart && d < todayEnd; });
  const upcoming  = all.filter((a: any) => ["pending","confirmed"].includes(a.status));
  const pending   = all.filter((a: any) => a.status === "pending");
  const completed = all.filter((a: any) => a.status === "completed");

  const todayRevenue = today
    .filter((a: any) => ["completed","confirmed"].includes(a.status))
    .reduce((s: number, a: any) => s + (a.consultationFee || 0), 0);
  const totalRevenue = completed.reduce((s: number, a: any) => s + (a.consultationFee || 0), 0);
  const uniquePatients = new Set(all.map((a: any) => a.patientId)).size;

  const filtered = all.filter((a: any) =>
    !search || a.patient?.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { title: "Today's Appointments", value: today.length,       icon: Calendar,   color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40",    sub: "Scheduled today" },
    { title: "Pending Requests",     value: pending.length,     icon: Clock,      color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40", sub: "Awaiting confirmation" },
    { title: "Total Patients",       value: uniquePatients,     icon: Users,      color: "bg-violet-100 text-violet-600 dark:bg-violet-900/40", sub: "Unique patients" },
    { title: "Total Revenue",        value: `₹${totalRevenue}`, icon: DollarSign, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40", sub: `₹${todayRevenue} today` },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">Dr. {user.name} · {pending.length > 0 && <span className="text-amber-600 font-medium">{pending.length} pending</span>}</p>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => <StatCard key={s.title} {...s} />)}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="today">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="today" className="rounded-lg text-xs sm:text-sm">
            Today
            {today.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                {today.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg text-xs sm:text-sm">
            Pending
            {pending.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-lg text-xs sm:text-sm">Upcoming</TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm">All</TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-lg text-xs sm:text-sm">My Schedule</TabsTrigger>
        </TabsList>

        {/* Today */}
        <TabsContent value="today" className="space-y-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : today.length === 0
              ? <Empty icon={Calendar} message="No appointments today" />
              : today.map((a: any) => <AppointmentRow key={a.id} apt={a} showActions />)
          }
        </TabsContent>

        {/* Pending — needs action */}
        <TabsContent value="pending" className="space-y-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : pending.length === 0
              ? <Empty icon={CheckCircle} message="No pending appointments" />
              : pending.map((a: any) => <AppointmentRow key={a.id} apt={a} showActions />)
          }
        </TabsContent>

        {/* Upcoming (pending + confirmed) */}
        <TabsContent value="upcoming" className="space-y-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : upcoming.length === 0
              ? <Empty icon={Clock} message="No upcoming appointments" />
              : upcoming.map((a: any) => <AppointmentRow key={a.id} apt={a} showActions />)
          }
        </TabsContent>

        {/* All with search */}
        <TabsContent value="all" className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : filtered.length === 0
              ? <Empty icon={Activity} message={search ? "No patients match your search" : "No appointments yet"} />
              : filtered.map((a: any) => <AppointmentRow key={a.id} apt={a} showActions />)
          }
        </TabsContent>

        {/* My Schedule */}
        <TabsContent value="schedule">
          <ScheduleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
