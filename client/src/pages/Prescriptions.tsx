import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAppointments } from "@/hooks/use-appointments";
import { usePrescriptions, useCreatePrescription } from "@/hooks/use-prescriptions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { FileText, Plus, Trash2, Pill, Calendar } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
}

function WritePrescriptionDialog({ appointments }: { appointments: any[] }) {
  const { mutate: createPrescription, isPending } = useCreatePrescription();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
  const [medicines, setMedicines] = useState<Medicine[]>([{ name: "", dosage: "", frequency: "" }]);
  const [instructions, setInstructions] = useState("");

  const completedAppointments = appointments.filter(
    (a) => a.status === "confirmed" || a.status === "completed"
  );

  const addMedicine = () => setMedicines([...medicines, { name: "", dosage: "", frequency: "" }]);
  const removeMedicine = (i: number) => setMedicines(medicines.filter((_, idx) => idx !== i));
  const updateMedicine = (i: number, field: keyof Medicine, value: string) => {
    const updated = [...medicines]; updated[i][field] = value; setMedicines(updated);
  };

  const handleSubmit = () => {
    if (!selectedAppointmentId) return;
    const validMeds = medicines.filter((m) => m.name.trim());
    if (validMeds.length === 0) return;
    createPrescription(
      { appointmentId: parseInt(selectedAppointmentId), medicines: validMeds, instructions },
      { onSuccess: () => { setOpen(false); setSelectedAppointmentId(""); setMedicines([{ name: "", dosage: "", frequency: "" }]); setInstructions(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> {t.prescriptions.writePrescription}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.prescriptions.writePrescription}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          <div className="space-y-2">
            <Label>{t.prescriptions.selectAppointment}</Label>
            <Select value={selectedAppointmentId} onValueChange={setSelectedAppointmentId}>
              <SelectTrigger><SelectValue placeholder={t.prescriptions.choosePrescAppt} /></SelectTrigger>
              <SelectContent>
                {completedAppointments.length === 0 ? (
                  <SelectItem value="none" disabled>{t.prescriptions.noConfirmedAppts}</SelectItem>
                ) : (
                  completedAppointments.map((apt) => (
                    <SelectItem key={apt.id} value={String(apt.id)}>
                      {apt.patient.user.name} — {format(new Date(apt.date), "MMM d, yyyy")}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t.prescriptions.medicines}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMedicine}>
                <Plus className="w-3 h-3 mr-1" /> {t.prescriptions.addMedicine}
              </Button>
            </div>
            {medicines.map((med, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg relative">
                <Input placeholder={t.prescriptions.medicineName} value={med.name} onChange={(e) => updateMedicine(i, "name", e.target.value)} />
                <Input placeholder={t.prescriptions.dosage} value={med.dosage} onChange={(e) => updateMedicine(i, "dosage", e.target.value)} />
                <div className="flex gap-2">
                  <Input placeholder={t.prescriptions.frequency} value={med.frequency} onChange={(e) => updateMedicine(i, "frequency", e.target.value)} />
                  {medicines.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0" onClick={() => removeMedicine(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>{t.prescriptions.additionalInstr}</Label>
            <Textarea placeholder={t.prescriptions.instrPlaceholder} value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} />
          </div>

          <Button className="w-full" onClick={handleSubmit}
            disabled={isPending || !selectedAppointmentId || !medicines.some(m => m.name.trim())}>
            {isPending ? t.prescriptions.saving : t.prescriptions.savePrescription}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PrescriptionCard({ prescription, appointment, role }: { prescription: any; appointment: any; role: string }) {
  const { t } = useLanguage();
  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><FileText className="w-5 h-5 text-primary" /></div>
            <div>
              <CardTitle className="text-base">
                {role === "patient" ? `Dr. ${appointment?.doctor?.user?.name}` : appointment?.patient?.user?.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                {prescription.date ? format(new Date(prescription.date), "MMMM d, yyyy") : "—"}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">{appointment?.doctor?.specialization}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {prescription.medicines && prescription.medicines.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Pill className="w-3 h-3" /> {t.prescriptions.medicines}
            </p>
            <div className="space-y-2">
              {prescription.medicines.map((med: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                  <span className="font-medium">{med.name}</span>
                  <div className="flex gap-3 text-muted-foreground">
                    <span>{med.dosage}</span><span>•</span><span>{med.frequency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {prescription.instructions && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t.prescriptions.instructions}</p>
            <p className="text-sm text-foreground bg-amber-50 border border-amber-100 rounded-lg p-3">{prescription.instructions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Prescriptions() {
  const { user } = useAuth();
  const { data: appointments } = useAppointments();
  const { data: prescriptions, isLoading } = usePrescriptions();
  const { t } = useLanguage();

  if (!user) return null;
  const isDoctor = user.role === "doctor";
  const enriched = (prescriptions || []).map((p: any) => ({
    prescription: p,
    appointment: appointments?.find((a: any) => a.id === p.appointmentId),
  }));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{t.prescriptions.title}</h2>
          <p className="text-muted-foreground mt-1">
            {isDoctor ? t.prescriptions.subtitleDoctor : t.prescriptions.subtitlePatient}
          </p>
        </div>
        {isDoctor && appointments && <WritePrescriptionDialog appointments={appointments} />}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Card key={i} className="h-48 animate-pulse bg-muted/30" />)}
        </div>
      ) : enriched.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
          <FileText className="w-14 h-14 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t.prescriptions.noPrescriptions}</h3>
          <p className="text-muted-foreground mt-1">
            {isDoctor ? t.prescriptions.emptyDoctor : t.prescriptions.emptyPatient}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {enriched.map(({ prescription, appointment }: any) => (
            <PrescriptionCard key={prescription.id} prescription={prescription} appointment={appointment} role={user.role} />
          ))}
        </div>
      )}
    </div>
  );
}
