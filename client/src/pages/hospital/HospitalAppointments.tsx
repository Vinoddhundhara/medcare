import { useState } from "react";
import {
  useHospitalAppointments, useUpdateHospitalAppointmentStatus,
  useAssignDoctor, useRescheduleAppointment, useHospitalDoctors,
} from "@/hooks/use-hospital-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar, Check, X, RefreshCw, UserCog, Loader2, Search } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function RescheduleDialog({ appointment, onClose }: any) {
  const [date, setDate] = useState(format(new Date(appointment.date), "yyyy-MM-dd"));
  const [time, setTime] = useState(format(new Date(appointment.date), "HH:mm"));
  const rescheduleMut = useRescheduleAppointment();

  const handleSave = async () => {
    await rescheduleMut.mutateAsync({ id: appointment.id, date: `${date}T${time}` });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reschedule Appointment</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>New Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>New Time</Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={rescheduleMut.isPending}>
            {rescheduleMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDoctorDialog({ appointment, onClose }: any) {
  const { data: doctors } = useHospitalDoctors({ status: "active" });
  const [doctorId, setDoctorId] = useState("");
  const assignMut = useAssignDoctor();

  const handleSave = async () => {
    if (!doctorId) return;
    await assignMut.mutateAsync({ appointmentId: appointment.id, doctorId: parseInt(doctorId) });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign Doctor</DialogTitle></DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Select Doctor</Label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger><SelectValue placeholder="Choose a doctor" /></SelectTrigger>
            <SelectContent>
              {doctors?.map((d: any) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.user?.name} — {d.specialization}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!doctorId || assignMut.isPending}>
            {assignMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentRow({ appt, onReschedule, onAssign }: any) {
  const updateStatus = useUpdateHospitalAppointmentStatus();

  const action = (status: string) => updateStatus.mutate({ id: appt.id, status });
  const isPending = updateStatus.isPending;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors text-sm">
      <td className="py-3 px-3">
        <div className="font-medium">{appt.patient?.user?.name || "—"}</div>
        <div className="text-xs text-muted-foreground">{appt.patient?.user?.email}</div>
      </td>
      <td className="py-3 px-3">
        <div>{appt.doctor?.user?.name || "—"}</div>
        <div className="text-xs text-muted-foreground">{appt.doctor?.specialization}</div>
      </td>
      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
        {format(new Date(appt.date), "MMM d, yyyy")}<br />
        <span className="text-xs">{format(new Date(appt.date), "h:mm a")}</span>
      </td>
      <td className="py-3 px-3">
        <Badge className={`text-xs capitalize ${STATUS_COLORS[appt.status]}`}>{appt.status}</Badge>
      </td>
      <td className="py-3 px-3">₹{appt.consultationFee}</td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-1 flex-wrap">
          {appt.status === "pending" && (
            <>
              <Button size="sm" variant="outline" onClick={() => action("confirmed")} disabled={isPending}
                className="h-7 text-xs text-green-600 hover:bg-green-50">
                <Check className="w-3 h-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => action("rejected")} disabled={isPending}
                className="h-7 text-xs text-red-500 hover:bg-red-50">
                <X className="w-3 h-3 mr-1" /> Reject
              </Button>
            </>
          )}
          {["pending", "confirmed"].includes(appt.status) && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onReschedule(appt)} className="h-7 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" /> Reschedule
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onAssign(appt)} className="h-7 text-xs">
                <UserCog className="w-3 h-3 mr-1" /> Reassign
              </Button>
            </>
          )}
          {appt.status === "confirmed" && (
            <Button size="sm" variant="outline" onClick={() => action("completed")} disabled={isPending}
              className="h-7 text-xs text-blue-600 hover:bg-blue-50">
              <Check className="w-3 h-3 mr-1" /> Complete
            </Button>
          )}
          {!["cancelled", "rejected", "completed"].includes(appt.status) && (
            <Button size="sm" variant="ghost" onClick={() => action("cancelled")} disabled={isPending}
              className="h-7 text-xs text-gray-500 hover:bg-gray-50">
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function HospitalAppointments() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [rescheduleAppt, setRescheduleAppt] = useState<any>(null);
  const [assignAppt, setAssignAppt] = useState<any>(null);

  const { data: appointments, isLoading } = useHospitalAppointments(
    filterStatus !== "all" ? { status: filterStatus } : undefined
  );

  const filtered = (appointments || []).filter((a: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.patient?.user?.name?.toLowerCase().includes(q) ||
      a.doctor?.user?.name?.toLowerCase().includes(q)
    );
  });

  const tabs = [
    { value: "all",       label: "All"       },
    { value: "pending",   label: "Pending"   },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="text-muted-foreground text-sm">{filtered.length} appointments</p>
      </div>

      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <TabsList className="flex-wrap h-auto">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <div className="relative sm:ml-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patient or doctor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
        </div>

        <TabsContent value={filterStatus} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : !filtered.length ? (
                <div className="flex flex-col items-center py-16 text-muted-foreground">
                  <Calendar className="w-10 h-10 mb-3" />
                  <p>No appointments found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                        <th className="text-left py-3 px-3 font-medium">Patient</th>
                        <th className="text-left py-3 px-3 font-medium">Doctor</th>
                        <th className="text-left py-3 px-3 font-medium">Date</th>
                        <th className="text-left py-3 px-3 font-medium">Status</th>
                        <th className="text-left py-3 px-3 font-medium">Fee</th>
                        <th className="text-left py-3 px-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a: any) => (
                        <AppointmentRow
                          key={a.id}
                          appt={a}
                          onReschedule={setRescheduleAppt}
                          onAssign={setAssignAppt}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {rescheduleAppt && <RescheduleDialog appointment={rescheduleAppt} onClose={() => setRescheduleAppt(null)} />}
      {assignAppt && <AssignDoctorDialog appointment={assignAppt} onClose={() => setAssignAppt(null)} />}
    </div>
  );
}
