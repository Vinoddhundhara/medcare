import { useState, useMemo } from "react";
import { useDoctors, useBookedSlots } from "@/hooks/use-doctors";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, Stethoscope, Star, Calendar, CheckCircle, Loader2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { cn } from "@/lib/utils";
import { format, addDays, isSameDay } from "date-fns";
import { useLanguage } from "@/context/LanguageContext";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Slot { time: string; dateTime: Date; }
interface DaySlots { date: Date; label: string; dayName: string; slots: Slot[]; }

const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

// ─── Build slots from structured availability (doctor_availability table) ──
// Falls back to legacy string array if no structured availability
function buildDaySlotsFromStructured(
  structuredAvail: any[],
  legacyAvail: string[] = []
): DaySlots[] {
  const result: DaySlots[] = [];
  const now = new Date();

  // If structured availability exists, use it
  if (structuredAvail && structuredAvail.length > 0) {
    for (let offset = 0; offset <= 13; offset++) {
      const checkDate = addDays(now, offset);
      const dayName = DAY_NAMES[checkDate.getDay()];
      const avail = structuredAvail.find((a: any) => a.dayOfWeek === dayName);
      if (!avail || !avail.isAvailable) continue;

      const [sh, sm] = (avail.startTime || "09:00").split(":").map(Number);
      const [eh, em] = (avail.endTime || "17:00").split(":").map(Number);
      const breakStart = avail.breakStart ? avail.breakStart.split(":").map(Number) : null;
      const breakEnd   = avail.breakEnd   ? avail.breakEnd.split(":").map(Number)   : null;
      const duration   = 60; // Always 1-hour slots

      const endTime = new Date(checkDate);
      endTime.setHours(eh, em, 0, 0);

      let slotTime = new Date(checkDate);
      slotTime.setHours(sh, sm, 0, 0);

      const slots: Slot[] = [];
      while (slotTime < endTime) {
        // Skip past times
        if (slotTime > now) {
          // Skip break period
          const inBreak = breakStart && breakEnd &&
            (slotTime.getHours() * 60 + slotTime.getMinutes()) >= (breakStart[0] * 60 + breakStart[1]) &&
            (slotTime.getHours() * 60 + slotTime.getMinutes()) < (breakEnd[0] * 60 + breakEnd[1]);
          if (!inBreak) {
            slots.push({ time: format(slotTime, "h:mm a"), dateTime: new Date(slotTime) });
          }
        }
        slotTime = new Date(slotTime.getTime() + duration * 60 * 1000);
      }

      if (slots.length > 0) {
        const isToday    = isSameDay(checkDate, now);
        const isTomorrow = isSameDay(checkDate, addDays(now, 1));
        result.push({
          date: checkDate,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          label: isToday ? "Today" : isTomorrow ? "Tomorrow" : format(checkDate, "EEE, MMM d"),
          slots,
        });
      }
      if (result.length >= 5) break;
    }
    return result;
  }

  // Legacy fallback: "Monday 09:00-17:00"
  const legacyDays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  for (let offset = 0; offset <= 6; offset++) {
    const checkDate = addDays(now, offset);
    const dayName   = legacyDays[checkDate.getDay()];
    const matches   = legacyAvail.filter(a => a.trim().startsWith(dayName));
    if (matches.length === 0) continue;

    const slotsMap = new Map<string, Date>();
    for (const match of matches) {
      const timeRange = match.trim().split(" ")[1] || "";
      const [startStr, endStr] = timeRange.split("-");
      if (!startStr || !endStr) continue;
      const [sh, sm] = startStr.split(":").map(Number);
      const [eh, em] = endStr.split(":").map(Number);
      let slotTime = new Date(checkDate);
      slotTime.setHours(sh, sm, 0, 0);
      const endTime = new Date(checkDate);
      endTime.setHours(eh, em, 0, 0);
      while (slotTime < endTime) {
        if (slotTime > now) {
          slotsMap.set(format(slotTime, "h:mm a"), new Date(slotTime));
        }
        slotTime = new Date(slotTime.getTime() + 60 * 60 * 1000);
      }
    }
    const slots = Array.from(slotsMap.entries())
      .map(([time, dateTime]) => ({ time, dateTime }))
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    if (slots.length > 0) {
      const isToday    = isSameDay(checkDate, now);
      const isTomorrow = isSameDay(checkDate, addDays(now, 1));
      result.push({
        date: checkDate,
        dayName,
        label: isToday ? "Today" : isTomorrow ? "Tomorrow" : format(checkDate, "EEE, MMM d"),
        slots,
      });
    }
    if (result.length >= 5) break;
  }
  return result;
}

// ─── Book Appointment Dialog ────────────────────────────────────────────────
function BookAppointmentDialog({ doctor, triggerLabel, prefilledReason = "" }: {
  doctor: any; triggerLabel?: string; prefilledReason?: string;
}) {
  const { mutate: createAppointment, isPending } = useCreateAppointment();
  const { t } = useLanguage();
  const fd = t.findDoctors;
  const [open, setOpen]               = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reason, setReason]           = useState(prefilledReason);
  const [confirmed, setConfirmed]     = useState(false);

  // Fetch booked slots + structured availability — auto-refreshes every 10s
  const { data: slotData } = useBookedSlots(doctor.id, open);

  const daySlots = useMemo(() => {
    const structured = slotData?.structuredAvailability || [];
    const legacy     = doctor.availability || [];
    return buildDaySlotsFromStructured(structured, legacy);
  }, [slotData?.structuredAvailability, doctor.availability]);

  // Build a Set of booked timestamps for O(1) lookup
  const bookedSet = useMemo(() => {
    const s = new Set<number>();
    (slotData?.bookedSlots || []).forEach((iso: string) => s.add(new Date(iso).getTime()));
    return s;
  }, [slotData?.bookedSlots]);

  const isBooked = (slot: Slot) => bookedSet.has(slot.dateTime.getTime());

  const handleOpen = () => {
    setSelectedDay(0); setSelectedSlot(null);
    setReason(prefilledReason); setConfirmed(false);
    setOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedSlot || !reason.trim()) return;
    createAppointment(
      { doctorId: doctor.id, date: selectedSlot.dateTime, reason },
      {
        onSuccess: () => { setConfirmed(true); setTimeout(() => setOpen(false), 2000); },
        onError:   () => { setSelectedSlot(null); },
      }
    );
  };

  const currentDay = daySlots[selectedDay];

  return (
    <>
      <Button className="w-full" onClick={handleOpen}>{triggerLabel || fd.bookAppointment}</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-blue-500 p-5 text-white flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="text-white text-lg">{fd.bookAppointment}</DialogTitle>
              <DialogDescription className="text-white/80 mt-1">
                Dr. {doctor.user.name} · {doctor.specialization}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-4 mt-3 text-sm text-white/90">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {doctor.hospital?.name || fd.independent}
              </span>
              <span className="font-semibold">₹{doctor.consultationFee}</span>
            </div>
          </div>

          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            {confirmed ? (
              <div className="text-center py-10 space-y-3">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
                <p className="text-lg font-bold">{fd.appointmentBooked}</p>
                <p className="text-sm text-muted-foreground">{selectedSlot?.time} · {currentDay?.label}</p>
              </div>
            ) : daySlots.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">{fd.noAvailability}</p>
                <p className="text-sm text-muted-foreground mt-1">{fd.noSchedule}</p>
              </div>
            ) : (
              <>
                {/* Day picker */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">
                    📅 {fd.selectDate}
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {daySlots.map((day, i) => {
                      const availCount = day.slots.filter(s => !isBooked(s)).length;
                      return (
                        <button
                          key={i}
                          onClick={() => { setSelectedDay(i); setSelectedSlot(null); }}
                          className={cn(
                            "flex flex-col items-center px-3 py-2 rounded-xl border min-w-[68px] transition-all flex-shrink-0",
                            selectedDay === i
                              ? "bg-primary text-primary-foreground border-primary shadow-md"
                              : "bg-muted/40 border-border hover:border-primary/50 hover:bg-muted"
                          )}
                        >
                          <span className="text-[10px] font-semibold uppercase">{day.dayName.slice(0,3)}</span>
                          <span className="text-xl font-bold leading-snug">{format(day.date, "d")}</span>
                          <span className="text-[10px] opacity-75">
                            {day.label === "Today" ? fd.today : day.label === "Tomorrow" ? fd.tmrw : format(day.date, "MMM")}
                          </span>
                          <span className={cn(
                            "text-[9px] mt-1 px-1.5 py-0.5 rounded-full",
                            selectedDay === i ? "bg-white/20 text-white" : availCount > 0 ? "bg-primary/10 text-primary" : "bg-red-100 text-red-500"
                          )}>
                            {availCount} free
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                {currentDay && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">
                      ⏰ {fd.availableSlots} — {currentDay.label}
                    </Label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {currentDay.slots.map((slot, i) => {
                        const booked   = isBooked(slot);
                        const selected = selectedSlot?.dateTime.getTime() === slot.dateTime.getTime();
                        return (
                          <button
                            key={i}
                            onClick={() => !booked && setSelectedSlot(slot)}
                            disabled={booked}
                            title={booked ? "Already booked" : slot.time}
                            className={cn(
                              "py-2 px-1 rounded-lg border text-xs font-medium transition-all text-center leading-tight relative",
                              booked
                                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-400 cursor-not-allowed line-through opacity-70"
                                : selected
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                                  : "bg-card border-border hover:border-primary/60 hover:bg-primary/5 cursor-pointer"
                            )}
                          >
                            {slot.time}
                            {booked && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-[8px] font-bold">✕</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {currentDay.slots.every(s => isBooked(s)) && (
                      <p className="text-xs text-center text-red-500 mt-2 font-medium">
                        All slots booked for this day. Please choose another date.
                      </p>
                    )}
                  </div>
                )}

                {/* Reason */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">
                    {fd.reasonForVisit} *
                  </Label>
                  <Textarea
                    placeholder={fd.reasonPlaceholder}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                {/* Booking summary */}
                {selectedSlot && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm space-y-1.5">
                    <p className="font-semibold text-primary">{fd.bookingSummary}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-muted-foreground">{fd.doctor}</span>
                      <span className="font-medium">Dr. {doctor.user.name}</span>
                      <span className="text-muted-foreground">{fd.date}</span>
                      <span className="font-medium">{currentDay?.label}</span>
                      <span className="text-muted-foreground">{fd.time}</span>
                      <span className="font-medium">{selectedSlot.time}</span>
                      <span className="text-muted-foreground">{fd.fee}</span>
                      <span className="font-medium">₹{doctor.consultationFee}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-11"
                  disabled={!selectedSlot || !reason.trim() || isPending}
                  onClick={handleConfirm}
                >
                  {isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{fd.booking}</>
                    : selectedSlot
                      ? `${fd.confirm} — ${selectedSlot.time} · ${currentDay?.label}`
                      : fd.selectSlot}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function FindDoctors() {
  const [search, setSearch]               = useState("");
  const [specialization, setSpecialization] = useState<string>("all");
  const { t } = useLanguage();
  const fd = t.findDoctors;

  const { data: doctors, isLoading } = useDoctors({
    search: search || undefined,
    specialization: specialization === "all" ? undefined : specialization,
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">{fd.title}</h2>
        <p className="text-muted-foreground mt-1">{fd.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-card rounded-xl border border-border/60 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={fd.searchPlaceholder}
            className="pl-9 bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full md:w-[250px]">
          <Select value={specialization} onValueChange={setSpecialization}>
            <SelectTrigger><SelectValue placeholder={fd.allSpecializations} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{fd.allSpecializations}</SelectItem>
              {["Cardiology","Dermatology","Neurology","Pediatrics","General Medicine",
                "Orthopedics","Pulmonology","Gastroenterology","Psychiatry","Gynecology"].map(s =>
                <SelectItem key={s} value={s}>{s}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-[300px] rounded-2xl" />)}
        </div>
      ) : !doctors?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No doctors found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor: any) => (
            <Card key={doctor.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-border/60">
              <div className="h-24 bg-gradient-to-r from-primary/10 to-blue-400/10 group-hover:from-primary/20 transition-all" />
              <CardContent className="-mt-12 pt-0 relative">
                <div className="flex justify-between items-end mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-muted p-1 shadow-md">
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl font-bold text-slate-400">
                      {doctor.user.name.charAt(0)}
                    </div>
                  </div>
                  <Badge variant="secondary" className="mb-2">{doctor.experience} {fd.yearsExp}</Badge>
                </div>
                <h3 className="text-xl font-bold mb-0.5">Dr. {doctor.user.name}</h3>
                <p className="text-primary font-medium flex items-center gap-1 mb-3">
                  <Stethoscope className="w-4 h-4" /> {doctor.specialization}
                </p>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {doctor.hospital && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 shrink-0" />
                      {doctor.hospital.name}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    ₹{doctor.consultationFee} consultation
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />
                    4.8 {fd.rating}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4">
                <BookAppointmentDialog doctor={doctor} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
