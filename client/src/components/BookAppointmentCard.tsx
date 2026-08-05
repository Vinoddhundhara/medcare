import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, addDays, isSameDay } from "date-fns";
import { CalendarClock, Shield, Video, UserCheck, CheckCircle2, ChevronRight, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { cn } from "@/lib/utils";
import type { AIDoctorResult } from "@/context/AIAssistantContext";

interface BookAppointmentCardProps {
  doctor: AIDoctorResult;
  symptoms: string;
  risk: string;
  specialist: string;
}

interface Slot {
  time: string;
  dateTime: Date;
}

interface DaySlots {
  date: Date;
  label: string;
  dayName: string;
  slots: Slot[];
}

// Re-use same slot generation logic from FindDoctors
function buildDaySlots(availability: string[] = []): DaySlots[] {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const result: DaySlots[] = [];
  const now = new Date();

  for (let offset = 0; offset <= 6; offset++) {
    const checkDate = addDays(now, offset);
    const dayName = days[checkDate.getDay()];
    // Find all availability slots for this day name
    const matches = availability.filter((a) => a.trim().startsWith(dayName));
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
          const timeStr = format(slotTime, "h:mm a");
          slotsMap.set(timeStr, new Date(slotTime));
        }
        slotTime = new Date(slotTime.getTime() + 60 * 60 * 1000);
      }
    }

    const slots: Slot[] = Array.from(slotsMap.entries())
      .map(([time, dateTime]) => ({ time, dateTime }))
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

    if (slots.length > 0) {
      const isToday = isSameDay(checkDate, now);
      const isTomorrow = isSameDay(checkDate, addDays(now, 1));
      result.push({
        date: checkDate,
        dayName,
        label: isToday ? "Today" : isTomorrow ? "Tomorrow" : format(checkDate, "EEE, MMM d"),
        slots,
      });
    }
    if (result.length >= 4) break; // Show max 4 days
  }
  return result;
}

export function BookAppointmentCard({
  doctor,
  symptoms,
  risk,
  specialist,
}: BookAppointmentCardProps) {
  const { toast } = useToast();
  const { mutate: createAppointment, isPending } = useCreateAppointment();

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [consultationType, setConsultationType] = useState<"online" | "offline" | "video">("online");
  const [bookingReason, setBookingReason] = useState(
    `AI Diagnosis Request: ${risk} risk. Primary Specialist: ${specialist}. Patient described symptoms: ${symptoms.substring(0, 100)}...`
  );
  const [confirmed, setConfirmed] = useState(false);

  // Build availability slots
  const daySlots = useMemo(() => buildDaySlots(doctor.availability || []), [doctor.availability]);

  // Find the very earliest slot for Card 5
  const earliestSlotInfo = useMemo(() => {
    if (daySlots.length === 0 || daySlots[0].slots.length === 0) return null;
    return {
      dayLabel: daySlots[0].label,
      time: daySlots[0].slots[0].time,
      dateTime: daySlots[0].slots[0].dateTime,
    };
  }, [daySlots]);

  // Consultation options with fees
  const availableModes = useMemo(() => {
    const list: { value: "online" | "offline" | "video"; label: string; fee: number }[] = [];
    if (doctor.onlineEnabled !== false) {
      list.push({ value: "online", label: "Online Chat", fee: doctor.onlineFee ?? 500 });
    }
    if (doctor.offlineEnabled !== false) {
      list.push({ value: "offline", label: "In-Clinic Visit", fee: doctor.offlineFee ?? 700 });
    }
    if (doctor.videoEnabled !== false) {
      list.push({ value: "video", label: "Video Call", fee: doctor.videoFee ?? 600 });
    }
    // fallback if all false
    if (list.length === 0) {
      list.push({ value: "online", label: "Online Chat", fee: doctor.consultationFee });
    }
    return list;
  }, [doctor]);

  const activeFee = useMemo(() => {
    const mode = availableModes.find((m) => m.value === consultationType);
    return mode ? mode.fee : doctor.consultationFee;
  }, [consultationType, availableModes, doctor.consultationFee]);

  const handleOpenBooking = () => {
    // Preset states
    setSelectedDayIdx(0);
    setSelectedSlot(earliestSlotInfo ? { time: earliestSlotInfo.time, dateTime: earliestSlotInfo.dateTime } : null);
    setConfirmed(false);
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = () => {
    if (!selectedSlot) {
      toast({
        title: "Selection Required",
        description: "Please select an appointment time slot.",
        variant: "destructive",
      });
      return;
    }

    createAppointment(
      {
        doctorId: doctor.id,
        date: selectedSlot.dateTime,
        reason: bookingReason,
        consultationType,
        consultationFee: activeFee,
      },
      {
        onSuccess: () => {
          setConfirmed(true);
          toast({
            title: "Success!",
            description: `Appointment booked with Dr. ${doctor.name}`,
          });
          setTimeout(() => {
            setBookingModalOpen(false);
          }, 1800);
        },
        onError: (err) => {
          toast({
            title: "Booking Failed",
            description: "Please pick another time slot or try again later.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const currentDay = daySlots[selectedDayIdx];

  return (
    <div className="w-full space-y-3">
      {/* Card 5: Earliest Available Slot */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="border-border/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-zinc-900 dark:to-zinc-850 backdrop-blur-md shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <CalendarClock className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  ⚡ Earliest Available Slot
                </p>
                <p className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                  {earliestSlotInfo
                    ? `${earliestSlotInfo.dayLabel} at ${earliestSlotInfo.time}`
                    : "No slot available"}
                </p>
              </div>
            </div>
            {earliestSlotInfo && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                Live Availability
              </span>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Card 6: Book Appointment Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Button
          onClick={handleOpenBooking}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-[0_4px_15px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all duration-300 flex items-center justify-center gap-2 group text-sm"
        >
          <CalendarClock className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
          Book Appointment with Dr. {doctor.name.split(" ")[0]}
          <ChevronRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </motion.div>

      {/* Booking Dialog Modal */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl max-h-[90vh] flex flex-col border border-border dark:border-zinc-800">
          {/* Header styling */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-white/95" />
                Schedule Consultation
              </DialogTitle>
              <DialogDescription className="text-white/80 text-xs mt-1 font-medium">
                Dr. {doctor.name} · {doctor.specialization} · {doctor.hospital}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {confirmed ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto animate-bounce" />
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">Appointment Booked Successfully!</p>
                <p className="text-xs text-muted-foreground">
                  {selectedSlot?.time} · {currentDay?.label}
                </p>
                <p className="text-[10px] text-muted-foreground italic">
                  An email notification has been dispatched to your address.
                </p>
              </div>
            ) : (
              <>
                {daySlots.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No available time slots found.
                  </div>
                ) : (
                  <>
                    {/* Step 1: Select Day */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground block">
                        📅 Select Date
                      </Label>
                      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                        {daySlots.map((day, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedDayIdx(idx);
                              setSelectedSlot(day.slots[0] || null);
                            }}
                            className={cn(
                              "flex flex-col items-center px-3 py-2 rounded-xl border text-[11px] font-bold min-w-[75px] transition-all flex-shrink-0",
                              selectedDayIdx === idx
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-muted/40 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span>{day.label}</span>
                            <span className="text-[9px] opacity-75 font-normal">
                              {day.slots.length} slots
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Select Time Slot */}
                    {currentDay && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground block">
                          ⏰ Select Time
                        </Label>
                        <div className="grid grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {currentDay.slots.map((slot, sIdx) => {
                            const isSlotSelected = selectedSlot?.time === slot.time;
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={cn(
                                  "py-2 rounded-lg border text-xs font-medium transition-all text-center",
                                  isSlotSelected
                                    ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                                    : "bg-zinc-50 dark:bg-zinc-800/40 border-border hover:border-primary/40 text-zinc-700 dark:text-zinc-300"
                                )}
                              >
                                {slot.time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step 3: Consultation Mode */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground block">
                        💻 Consultation Type
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {availableModes.map((mode) => (
                          <button
                            key={mode.value}
                            type="button"
                            onClick={() => setConsultationType(mode.value)}
                            className={cn(
                              "border rounded-xl p-2.5 flex flex-col items-center gap-1.5 cursor-pointer text-center transition-all",
                              consultationType === mode.value
                                ? "border-primary bg-primary/5 text-primary shadow-sm"
                                : "border-border hover:bg-muted text-muted-foreground"
                            )}
                          >
                            {mode.value === "video" && <Video className="w-4 h-4 text-indigo-500" />}
                            {mode.value === "online" && <MessageSquare className="w-4 h-4 text-blue-500" />}
                            {mode.value === "offline" && <Shield className="w-4 h-4 text-emerald-500" />}
                            <span className="text-[10px] font-bold">{mode.label}</span>
                            <span className="text-[9px] text-zinc-600 dark:text-zinc-400 font-semibold mt-0.5">
                              ₹{mode.fee}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 4: Reason summary */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground block">
                        📝 Consultation Reason (Synced from AI Analysis)
                      </Label>
                      <Textarea
                        value={bookingReason}
                        onChange={(e) => setBookingReason(e.target.value)}
                        placeholder="Please describe your symptoms..."
                        className="text-xs resize-none h-16 min-h-[60px]"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {!confirmed && daySlots.length > 0 && (
            <div className="p-4 border-t border-border bg-zinc-50 dark:bg-zinc-900 flex-shrink-0 flex items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">Total Amount</span>
                <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">₹{activeFee}</span>
              </div>
              <Button
                disabled={isPending || !selectedSlot}
                onClick={handleConfirmBooking}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl px-6 h-10 text-xs shadow-md shrink-0"
              >
                {isPending ? "Confirming..." : "Confirm & Pay"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BookAppointmentCard;
