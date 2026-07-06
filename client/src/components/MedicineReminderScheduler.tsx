import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isBefore, isAfter, format } from "date-fns";

/**
 * Runs silently in the background.
 * Every minute it checks if any active medicine reminder is due RIGHT NOW
 * and fires a toast notification — even if the user is on a different page.
 */
export function MedicineReminderScheduler() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Track which reminder+day combos we already fired so we don't repeat
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || user.role !== "patient") return;

    const check = async () => {
      try {
        const res = await fetch("/api/medicine-reminders", { credentials: "include" });
        if (!res.ok) return;
        const reminders: any[] = await res.json();
        const now = new Date();
        const today = format(now, "yyyy-MM-dd");

        reminders.forEach(r => {
          if (!r.isActive) return;

          const startDate = new Date(r.startDate);
          const endDate = r.endDate ? new Date(r.endDate) : null;

          // Not started yet or already ended
          if (isBefore(now, startDate)) return;
          if (endDate && isAfter(now, endDate)) return;

          const [hours, minutes] = r.time.split(":").map(Number);
          const scheduledTime = new Date();
          scheduledTime.setHours(hours, minutes, 0, 0);

          const diffMins = (now.getTime() - scheduledTime.getTime()) / 60000;

          // Fire if within a 1-minute window AFTER scheduled time (0 to +1 min)
          const fireKey = `${r.id}-${today}-${r.time}`;
          if (diffMins >= 0 && diffMins < 1 && !firedRef.current.has(fireKey)) {
            firedRef.current.add(fireKey);
            toast({
              title: `💊 Time to take ${r.medicineName}`,
              description: `${r.dosage} · ${r.frequency}. Don't forget your medication!`,
              duration: 10000, // Show for 10 seconds
            });
          }
        });
      } catch {
        // silently fail
      }
    };

    // Check immediately on mount, then every 30 seconds for precision
    check();
    const interval = setInterval(check, 30 * 1000);
    return () => clearInterval(interval);
  }, [user, toast]);

  return null; // renders nothing
}
