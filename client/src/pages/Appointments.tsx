import { useState } from "react";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Calendar, Check, X, Clock, FileText, Ban, Video, ExternalLink, Link2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { api } from "@shared/routes";
import { useLanguage } from "@/context/LanguageContext";

const statusColors: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  rejected:  "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

// ─── Video Call Link form (doctor only) ──────────────────────────────────────

function VideoLinkForm({ appointmentId, existingLink }: { appointmentId: number; existingLink?: string }) {
  const [link, setLink] = useState(existingLink || "");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSave = async () => {
    if (!link.trim()) return;
    try { new URL(link); } catch {
      toast({ title: t.appointments.invalidUrl, description: t.appointments.validLink, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/video-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save link");
      }
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path], refetchType: "all" });
      toast({ title: t.appointments.videoSaved, description: t.appointments.patientEmail });
      setShowForm(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!showForm) {
    return (
      <Button size="sm" variant="outline" className="text-violet-600 hover:bg-violet-50 border-violet-200" onClick={() => setShowForm(true)}>
        <Video className="w-4 h-4 mr-1" />
        {existingLink ? t.appointments.updateLink : t.appointments.addVideoCall}
      </Button>
    );
  }

  return (
    <div className="flex gap-2 items-center w-full mt-3">
      <Input placeholder="https://meet.google.com/xxx-xxxx-xxx" value={link} onChange={(e) => setLink(e.target.value)} className="text-sm h-9" autoFocus />
      <Button size="sm" onClick={handleSave} disabled={saving} className="shrink-0">
        {saving ? t.appointments.saving : t.appointments.save}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="shrink-0">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Appointments() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useAppointments();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateAppointmentStatus();
  const { t } = useLanguage();

  const isDoctor  = user?.role === "doctor";
  const isPatient = user?.role === "patient";

  const upcoming = appointments?.filter((a: any) =>
    ["pending", "confirmed"].includes(a.status)
  ) ?? [];

  const history = appointments?.filter((a: any) =>
    ["completed", "rejected", "cancelled"].includes(a.status)
  ) ?? [];

  const AppointmentCard = ({ apt }: { apt: any }) => (
    <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center justify-center w-16 h-16 bg-primary/10 rounded-xl text-primary font-bold shrink-0">
                <span className="text-xs uppercase">{format(new Date(apt.date), "MMM")}</span>
                <span className="text-2xl leading-none">{format(new Date(apt.date), "d")}</span>
              </div>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 flex-wrap">
                  {isDoctor ? apt.patient?.user?.name ?? "Unknown Patient" : `Dr. ${apt.doctor?.user?.name ?? "Unknown"}`}
                  <Badge variant="secondary" className={statusColors[apt.status]}>{apt.status}</Badge>
                </h3>
                <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{format(new Date(apt.date), "h:mm a")}</span>
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{apt.reason || t.appointments.noReason}</span>
                  {!isDoctor && apt.doctor?.specialization && <span className="text-primary font-medium">{apt.doctor.specialization}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              {isDoctor && apt.status === "pending" && (
                <>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={isUpdating} onClick={() => updateStatus({ id: apt.id, status: "rejected" })}>
                    <X className="w-4 h-4 mr-1" /> {t.appointments.reject}
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700"
                    disabled={isUpdating} onClick={() => updateStatus({ id: apt.id, status: "confirmed" })}>
                    <Check className="w-4 h-4 mr-1" /> {t.appointments.confirm}
                  </Button>
                </>
              )}
              {isDoctor && apt.status === "confirmed" && (
                <Button size="sm" variant="outline" className="text-blue-600 hover:bg-blue-50"
                  disabled={isUpdating} onClick={() => updateStatus({ id: apt.id, status: "completed" })}>
                  <Check className="w-4 h-4 mr-1" /> {t.appointments.markCompleted}
                </Button>
              )}
              {isPatient && ["pending", "confirmed"].includes(apt.status) && (
                <Button size="sm" variant="outline" className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                  disabled={isUpdating} onClick={() => updateStatus({ id: apt.id, status: "cancelled" })}>
                  <Ban className="w-4 h-4 mr-1" /> {t.appointments.cancel}
                </Button>
              )}
            </div>
          </div>
          {apt.status === "confirmed" && (
            <div className="border-t border-border/50 pt-3">
              {isDoctor && <VideoLinkForm appointmentId={apt.id} existingLink={apt.videoCallLink} />}
              {isPatient && apt.videoCallLink && (
                <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-100 rounded-xl">
                  <div className="p-2 bg-violet-100 rounded-lg shrink-0"><Video className="w-4 h-4 text-violet-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-violet-900">{t.appointments.videoReady}</p>
                    <p className="text-xs text-violet-600 truncate">{apt.videoCallLink}</p>
                  </div>
                  <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700 shrink-0">
                      <ExternalLink className="w-4 h-4 mr-1" /> {t.appointments.joinCall}
                    </Button>
                  </a>
                </div>
              )}
              {isPatient && !apt.videoCallLink && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link2 className="w-4 h-4" />{t.appointments.waitingVideo}
                </div>
              )}
              {isDoctor && apt.videoCallLink && (
                <div className="flex items-center gap-2 mt-2 text-sm text-violet-600">
                  <Video className="w-4 h-4 shrink-0" />
                  <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{apt.videoCallLink}</a>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message, showBook }: { message: string; showBook?: boolean }) => (
    <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border">
      <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground">{message}</p>
      {showBook && (
        <Link href="/doctors">
          <Button className="mt-4">{t.appointments.bookAnAppt}</Button>
        </Link>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{t.appointments.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t.appointments.subtitle}</p>
      </div>
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:max-w-[400px]">
          <TabsTrigger value="upcoming">
            {t.appointments.upcoming}
            {upcoming.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">{upcoming.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">{t.appointments.history}</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {isLoading
            ? [1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            : upcoming.length === 0
              ? <EmptyState message={t.appointments.noUpcoming} showBook={isPatient} />
              : upcoming.map((apt: any) => <AppointmentCard key={apt.id} apt={apt} />)}
        </TabsContent>
        <TabsContent value="history" className="mt-6 space-y-4">
          {isLoading
            ? [1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            : history.length === 0
              ? <EmptyState message={t.appointments.noHistory} />
              : history.map((apt: any) => <AppointmentCard key={apt.id} apt={apt} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
